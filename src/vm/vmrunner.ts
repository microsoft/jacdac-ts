import { IT4Program, IT4Handler, IT4Command } from "./ir"
import { MyRoleManager } from "./rolemanager"
import { VMEnvironment } from "./environment"
import { JDExprEvaluator } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ERROR, TRACE } from "../jdom/constants"
import { checkProgram, compileProgram } from "./ir"
import {
    ROLE_CHANGE,
    ROLE_SERVICE_BOUND,
    ROLE_SERVICE_UNBOUND,
    VM_COMMAND_ATTEMPTED,
    VM_COMMAND_COMPLETED,
    JDVMError,
} from "./utils"
import { unparse } from "./expr"
import { SMap } from "../jdom/utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TraceContext = any

export enum VMStatus {
    ProgramError = "programerror",
    Ready = "ready",
    Running = "running",
    Completed = "completed",
    Stopped = "stopped",
}

interface Environment {
    writeRegisterAsync: (
        e: jsep.MemberExpression | string,
        v: any
    ) => Promise<void>
    sendCommandAsync: (
        command: jsep.MemberExpression,
        values: any[]
    ) => Promise<void>
    refreshRegistersAsync: () => Promise<void>
    lookup: (e: jsep.MemberExpression | string) => any
    writeLocal: (e: jsep.MemberExpression | string, v: any) => boolean
    hasEvent: (e: jsep.MemberExpression | string) => boolean
    unsubscribe: () => void
}

class JumpException {
    constructor(public label: string) {}
}

class IT4CommandEvaluator {
    private _status: VMStatus
    private _regSaved: number = undefined
    private _changeSaved: number = undefined
    private _started = false
    constructor(
        public parent: IT4CommandRunner,
        private readonly env: Environment,
        private readonly gc: IT4Command
    ) {}

    trace(msg: string, context: TraceContext = {}) {
        this.parent.trace(msg, { command: this.gc.command.type, ...context })
    }

    get status() {
        return this._status
    }

    private get inst() {
        return (this.gc.command.callee as jsep.Identifier)?.name
    }

    private evalExpression(e: jsep.Expression) {
        const expr = new JDExprEvaluator(e => this.env.lookup(e), undefined)
        return expr.eval(e)
    }

    private checkExpression(e: jsep.Expression) {
        return this.evalExpression(e) ? true : false
    }

    private start() {
        if (
            this.gc.command.callee.type !== "MemberExpression" &&
            (this.inst === "awaitRegister" || this.inst === "awaitChange")
        ) {
            // need to capture register value for awaitChange/awaitRegister
            const args = this.gc.command.arguments
            this._regSaved = this.evalExpression(args[0])
            if (this.inst === "awaitChange")
                this._changeSaved = this.evalExpression(args[1])
            return true
        }
        return false
    }

    public async evaluate() {
        this._status = VMStatus.Running
        if (!this._started) {
            const neededStart = this.start()
            this._started = true
            if (neededStart) return
        }
        const args = this.gc.command.arguments
        if (this.gc.command.callee.type === "MemberExpression") {
            // interpret as a service command (role.comand)
            const expr = new JDExprEvaluator(e => this.env.lookup(e), undefined)
            const values = this.gc.command.arguments.map(a => expr.eval(a))
            await this.env.sendCommandAsync(
                this.gc.command.callee as jsep.MemberExpression,
                values
            )
            this._status = VMStatus.Completed
            return
        }
        switch (this.inst) {
            case "branchOnCondition": {
                const expr = this.checkExpression(args[0])
                if (expr) {
                    throw new JumpException((args[1] as jsep.Identifier).name)
                }
                this._status = VMStatus.Completed
                break
            }
            case "jump": {
                this._status = VMStatus.Completed
                throw new JumpException((args[0] as jsep.Identifier).name)
            }
            case "label": {
                this._status = VMStatus.Completed
                break
            }
            case "awaitEvent": {
                const event = args[0] as jsep.MemberExpression
                if (this.env.hasEvent(event)) {
                    this._status = this.checkExpression(args[1])
                        ? VMStatus.Completed
                        : VMStatus.Running
                }
                break
            }
            case "awaitCondition": {
                this._status = this.checkExpression(args[0])
                    ? VMStatus.Completed
                    : VMStatus.Running
                break
            }
            case "awaitChange":
            case "awaitRegister": {
                const regValue = this.evalExpression(args[0])
                if (
                    (this.inst === "awaitRegister" &&
                        regValue !== this._regSaved) ||
                    (this.inst === "awaitChange" &&
                        ((this._changeSaved === 0 &&
                            regValue !== this._regSaved) ||
                            (this._changeSaved < 0 &&
                                regValue <=
                                    this._regSaved + this._changeSaved) ||
                            (this._changeSaved > 0 &&
                                regValue >=
                                    this._regSaved + this._changeSaved)))
                ) {
                    this._status = VMStatus.Completed
                }
                break
            }
            case "writeRegister":
            case "writeLocal": {
                const expr = new JDExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[1])
                this.trace("eval-end", { expr: unparse(args[1]) })
                const reg = args[0] as jsep.MemberExpression
                if (this.inst === "writeRegister") {
                    await this.env.writeRegisterAsync(reg, ev)
                    this.trace("write-after-wait", {
                        reg: unparse(reg),
                        expr: ev,
                    })
                } else this.env.writeLocal(reg, ev)
                this._status = VMStatus.Completed
                break
            }
            case "halt": {
                this._status = VMStatus.Stopped
                break
            }
            default:
                throw new JDVMError(`Unknown instruction ${this.inst}`)
        }
    }
}

class IT4CommandRunner {
    private _status = VMStatus.Running
    private _eval: IT4CommandEvaluator
    constructor(
        public readonly parent: IT4HandlerRunner,
        private handlerId: number,
        env: Environment,
        public gc: IT4Command
    ) {
        this._eval = new IT4CommandEvaluator(this, env, gc)
    }

    trace(msg: string, context: TraceContext = {}) {
        this.parent.trace(msg, { handler: this.handlerId, ...context })
    }

    get status() {
        return this._status
    }

    set status(s: VMStatus) {
        if (s != this._status) {
            this._status = s
            // TODO: emit event
        }
    }

    get isWaiting(): boolean {
        return this.status === VMStatus.Running
    }

    async step() {
        if (this.isWaiting) {
            this.trace(unparse(this.gc.command))
            await this._eval.evaluate()
            this.finish(this._eval.status)
        }
    }

    cancel() {
        this.finish(VMStatus.Stopped)
    }

    private finish(s: VMStatus) {
        this.trace(s)
        if (
            (this.isWaiting && s === VMStatus.Completed) ||
            s === VMStatus.Stopped
        ) {
            this.status = s
        }
    }
}

class IT4HandlerRunner extends JDEventSource {
    private _commandIndex: number
    private _currentCommand: IT4CommandRunner
    private stopped = false
    private _labelToIndex: SMap<number> = {}

    constructor(
        public readonly parent: IT4ProgramRunner,
        public readonly id: number,
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        super()
        // find the label commands (targets of jumps)
        this.handler.commands.forEach((c, index) => {
            const cmd = c as IT4Command
            const id = cmd.command?.callee as jsep.Identifier
            if (id?.name === "label") {
                const label = cmd.command.arguments[0] as jsep.Identifier
                this._labelToIndex[label.name] = index
            }
        })
        this.reset()
    }

    trace(msg: string, context: TraceContext = {}) {
        this.parent.trace(msg, { id: this.id, ...context })
    }

    get status() {
        return this.stopped
            ? VMStatus.Stopped
            : this._currentCommand === undefined
            ? VMStatus.Ready
            : this._currentCommand.status
    }

    public reset() {
        this.commandIndex = undefined
        this.stopped = false
    }

    cancel() {
        this.stopped = true
        this.env.unsubscribe()
    }

    private getCommand() {
        const cmd = this.handler.commands[this._commandIndex]
        if (cmd.type === "ite") {
            throw new JDVMError("ite not compiled away")
        }
        return cmd as IT4Command
    }

    private async executeCommandAsync() {
        this.emit(VM_COMMAND_ATTEMPTED, this._currentCommand.gc.sourceId)
        try {
            await this._currentCommand.step()
        } catch (e) {
            if (e instanceof JumpException) {
                const { label } = e as JumpException
                const index = this._labelToIndex[label]
                this.commandIndex = index
                // since it's a label it executes successfully
                this._currentCommand.status = VMStatus.Completed
            } else {
                throw e
            }
        }
        if (this._currentCommand.status === VMStatus.Completed)
            this.emit(
                VM_COMMAND_COMPLETED,
                this._currentCommand.gc.sourceId
            )
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
    }

    private set commandIndex(index: number) {
        if (index === undefined) {
            this._commandIndex = undefined
            this._currentCommand = undefined
        } else if (index !== this._commandIndex) {
            this._commandIndex = index
            this._currentCommand = new IT4CommandRunner(
                this,
                this.id,
                this.env,
                this.getCommand()
            )
        }
    }

    private get commandIndex() {
        return this._commandIndex
    }

    // run-to-completion semantics
    async step() {
        // handler stopped or/ empty
        if (this.stopped || !this.handler.commands.length) return
        this.trace("step begin")
        if (this.commandIndex === undefined) {
            this.commandIndex = 0
        }
        await this.executeCommandAsync()
        while (
            this._currentCommand.status === VMStatus.Completed &&
            this.commandIndex < this.handler.commands.length - 1
        ) {
            this.commandIndex++
            await this.executeCommandAsync()
        }
        this.trace("step end")
    }
}

export class IT4ProgramRunner extends JDEventSource {
    private _handlers: IT4HandlerRunner[] = []
    private _env: VMEnvironment
    private _waitQueue: IT4HandlerRunner[] = []
    private _running = false
    private _in_run = false
    private _rm: MyRoleManager
    private _program: IT4Program

    trace(message: string, context: TraceContext = {}) {
        this.emit(TRACE, { message, context })
    }

    constructor(prog: IT4Program, bus: JDBus) {
        super()
        try {
            this._program = compileProgram(prog)
            const [regs, events] = checkProgram(this._program)
            if (this._program.errors.length > 0) {
                console.debug(this._program.errors)
            }
            this._rm = new MyRoleManager(bus, (role, service, added) => {
                try {
                    this._env.serviceChanged(role, service, added)
                    if (added) {
                        this.emit(ROLE_SERVICE_BOUND, service)
                        this.emit(ROLE_CHANGE)
                        this.emit(CHANGE)
                        this._program.handlers.forEach(h => {
                            regs.forEach(r => {
                                if (r.role === role) {
                                    this._env.registerRegister(role, r.register)
                                }
                            })
                            events.forEach(e => {
                                if (e.role === role) {
                                    this._env.registerEvent(role, e.event)
                                }
                            })
                        })
                    } else {
                        this.emit(ROLE_SERVICE_UNBOUND, service)
                        this.emit(ROLE_CHANGE)
                        this.emit(CHANGE)
                    }
                } catch (e) {
                    console.debug(e)
                    this.emit(ERROR, e)
                }
            })
            this._env = new VMEnvironment()
            this._env.subscribe(CHANGE, () => {
                try {
                    this.run()
                } catch (e) {
                    console.debug(e)
                    this.emit(ERROR, e)
                }
            })
            this._handlers = this._program.handlers.map(
                (h, index) => new IT4HandlerRunner(this, index, this._env, h)
            )
            this._waitQueue = this._handlers.slice(0)
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    get status() {
        const ret =
            this._program === undefined
                ? VMStatus.ProgramError
                : this._running === false
                ? VMStatus.Stopped
                : this._waitQueue.length > 0
                ? VMStatus.Running
                : VMStatus.Completed
        return ret
    }

    cancel() {
        if (!this._program || !this._running) return // nothing to cancel

        this._running = false
        this._waitQueue = this._handlers.slice(0)
        this._waitQueue.forEach(h => h.reset())
        this.emit(CHANGE)
        this.trace("cancelled")
    }

    start() {
        if (!this._program || this._running) return // already running
        this.trace("start")
        try {
            this._program.roles.forEach(role => {
                this._rm.addRoleService(role.role, role.serviceShortId)
            })
            this._running = true
            this._in_run = false
            this.run()
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    get roles() {
        return this._program ? this._rm?.roles() : {}
    }

    resolveService(role: string) {
        return this._program && this._rm?.getService(role)
    }

    async run() {
        if (!this._program) return
        if (!this._running) return
        if (this._in_run) return
        this.trace("run")
        this._in_run = true
        try {
            await this._env.refreshRegistersAsync()
            if (this._waitQueue.length > 0) {
                const nextTime: IT4HandlerRunner[] = []
                for (const h of this._waitQueue) {
                    await h.step()
                    if (h.status !== VMStatus.Stopped) {
                        if (h.status === VMStatus.Completed) h.reset()
                        nextTime.push(h)
                    }
                }
                this._waitQueue = nextTime
                this._env.consumeEvent()
            } else {
                this.emit(CHANGE)
            }
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
        this._in_run = false
        this.trace("run end")
    }
}
