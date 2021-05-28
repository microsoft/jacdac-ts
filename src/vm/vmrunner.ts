import {
    IT4Program,
    IT4Handler,
    IT4Base,
    IT4Command,
    IT4IfThenElse,
} from "./ir"
import { MyRoleManager } from "./rolemanager"
import { VMEnvironment } from "./environment"
import { JDExprEvaluator } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ERROR, TRACE } from "../jdom/constants"
import { checkProgram, compileProgram } from "./ir"
import {
    JACDAC_ROLE_SERVICE_BOUND,
    JACDAC_ROLE_SERVICE_UNBOUND,
    JACDAC_VM_COMMAND_ATTEMPTED,
    JACDAC_VM_COMMAND_COMPLETED,
} from "./utils"
import { unparse } from "./expr"
import { JDVMError } from "./utils"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TraceContext = any

export enum VMStatus {
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
            case "breakOnCondition": {
                break   
            }
            case "jump": {
                break   
            }
            case "label": {
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
            try {
                this.trace(unparse(this.gc.command))
                await this._eval.evaluate()
                this.finish(this._eval.status)
            } catch (e) {
                console.log(e)
            }
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

    constructor(
        public readonly parent: IT4ProgramRunner,
        public readonly id: number,
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        super()
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
        this._commandIndex = undefined
        this._currentCommand = undefined
        this.stopped = false
    }

    cancel() {
        this.stopped = true
        this.env.unsubscribe()
    }

    private post_process() {
        if (this._currentCommand.status === VMStatus.Completed)
            this.emit(
                JACDAC_VM_COMMAND_COMPLETED,
                this._currentCommand.gc.sourceId
            )
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
    }

    private getCommand() {
        let cmd =  this.handler.commands[this._commandIndex]
        if (cmd.type === "ite") {
            throw new JDVMError("ite not compiled away")
        }
        return cmd as IT4Command
    }
    // run-to-completion semantics
    async step() {
        // handler stopped or/ empty
        if (this.stopped || !this.handler.commands.length) return
        // if (this._currentCommand?.status === VMStatus.Completed) return
        this.trace("step begin")
        if (this._commandIndex === undefined) {
            this._commandIndex = 0
            this._currentCommand = new IT4CommandRunner(
                this,
                this.id,
                this.env,
                this.getCommand()
            )
        }
        this.emit(JACDAC_VM_COMMAND_ATTEMPTED, this._currentCommand.gc.sourceId)
        await this._currentCommand.step()
        this.post_process()
        while (
            this._currentCommand.status === VMStatus.Completed &&
            this._commandIndex < this.handler.commands.length - 1
        ) {
            this._commandIndex++
            this._currentCommand = new IT4CommandRunner(
                this,
                this.id,
                this.env,
                this.getCommand()
            )
            this.emit(
                JACDAC_VM_COMMAND_ATTEMPTED,
                this._currentCommand.gc.sourceId
            )
            await this._currentCommand.step()
            this.post_process()
        }
        this.trace("step end")
    }
}

export class IT4ProgramRunner extends JDEventSource {
    private _handlers: IT4HandlerRunner[]
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
            const [regs, events] = checkProgram(this._program )
            if (this._program .errors.length > 0) {
                console.debug(this._program .errors)
            }
            this._rm = new MyRoleManager(bus, (role, service, added) => {
                try {
                    this._env.serviceChanged(role, service, added)
                    if (added) {
                        this.emit(JACDAC_ROLE_SERVICE_BOUND, service)
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
                        this.emit(JACDAC_ROLE_SERVICE_UNBOUND, service)
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
            this._running === false
                ? VMStatus.Stopped
                : this._waitQueue.length > 0
                ? VMStatus.Running
                : VMStatus.Completed
        return ret
    }

    cancel() {
        if (!this._running) return // nothing to cancel

        this._running = false
        this._waitQueue = this._handlers.slice(0)
        this._waitQueue.forEach(h => h.reset())
        this.emit(CHANGE)
        this.trace("cancelled")
    }

    start() {
        if (this._running) return // already running
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
        return this._rm?.roles()
    }

    async run() {
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
