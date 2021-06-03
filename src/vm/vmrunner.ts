import { VMProgram, VMHandler, VMCommand } from "./ir"
import { RoleManager, ROLE_BOUND, ROLE_UNBOUND } from "./rolemanager"
import { VMEnvironment } from "./environment"
import { JDExprEvaluator } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ERROR, TRACE } from "../jdom/constants"
import { checkProgram, compileProgram } from "./ir"
import {
    VM_COMMAND_ATTEMPTED,
    VM_COMMAND_COMPLETED,
    VM_WATCH_CHANGE,
    JDVMError,
} from "./utils"
import { unparse } from "./expr"
import { SMap } from "../jdom/utils"
import { JDClient } from "../jdom/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VMTraceContext = any

export enum VMStatus {
    ProgramError = "programerror",
    DebuggerBreak = "breakpoint",
    Ready = "ready",
    Running = "running",
    Completed = "completed",
    Stopped = "stopped",
}

export interface VMEnvironmentInterface {
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

class VMJumpException {
    constructor(public label: string) {}
}

class VMCommandEvaluator {
    private _status: VMStatus
    private _regSaved: number = undefined
    private _changeSaved: number = undefined
    private _started = false
    constructor(
        public parent: VMCommandRunner,
        private readonly env: VMEnvironment,
        private readonly gc: VMCommand
    ) {}

    trace(msg: string, context: VMTraceContext = {}) {
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
                    throw new VMJumpException((args[1] as jsep.Identifier).name)
                }
                this._status = VMStatus.Completed
                break
            }
            case "jump": {
                this._status = VMStatus.Completed
                throw new VMJumpException((args[0] as jsep.Identifier).name)
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
            case "watch": {
                const expr = new JDExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                this._status = VMStatus.Completed
                this.parent.watch(this.gc?.sourceId, ev)
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

class VMCommandRunner {
    private _status = VMStatus.Running
    private _eval: VMCommandEvaluator
    constructor(
        public readonly parent: VMHandlerRunner,
        private handlerId: number,
        env: VMEnvironment,
        public gc: VMCommand
    ) {
        this._eval = new VMCommandEvaluator(this, env, gc)
    }

    trace(msg: string, context: VMTraceContext = {}) {
        this.parent.trace(msg, { handler: this.handlerId, ...context })
    }

    watch(id: string, val: any) {
        this.parent.watch(id, val)
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

class VMHandlerRunner extends JDEventSource {
    private _commandIndex: number
    private _currentCommand: VMCommandRunner
    private stopped = false
    private _labelToIndex: SMap<number> = {}

    constructor(
        public readonly parent: VMProgramRunner,
        public readonly id: number,
        public readonly env: VMEnvironment,
        private readonly handler: VMHandler
    ) {
        super()
        // find the label commands (targets of jumps)
        this.handler.commands.forEach((c, index) => {
            const cmd = c as VMCommand
            const id = cmd.command?.callee as jsep.Identifier
            if (id?.name === "label") {
                const label = cmd.command.arguments[0] as jsep.Identifier
                this._labelToIndex[label.name] = index
            }
        })
        this.reset()
    }

    trace(msg: string, context: VMTraceContext = {}) {
        this.parent.trace(msg, { id: this.id, ...context })
    }

    watch(id: string, val: any) {
        this.parent.watch(id, val)
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
        return cmd as VMCommand
    }

    private async singleStepAsync() {
        const sid = this._currentCommand.gc.sourceId
        this.emit(VM_COMMAND_ATTEMPTED, sid)
        try {
            await this._currentCommand.step()
        } catch (e) {
            if (e instanceof VMJumpException) {
                const { label } = e as VMJumpException
                const index = this._labelToIndex[label]
                this.commandIndex = index
                // since it's a label it executes successfully
                this._currentCommand.status = VMStatus.Completed
            } else {
                this._currentCommand.status = VMStatus.ProgramError
                throw e
            }
        }
        if (this._currentCommand.status === VMStatus.Completed)
            this.emit(VM_COMMAND_COMPLETED, this._currentCommand.gc.sourceId)
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
        return false
    }

    private async singleStepBreakAsync() {
        const sid = this._currentCommand.gc.sourceId
        if (this.parent.breakPointOn(sid)) {
            // PROBLEM:
            this._currentCommand.status = VMStatus.DebuggerBreak
            return true
        }
        return await this.singleStepAsync()
    }

    async step() {
        if (this.status === VMStatus.DebuggerBreak) {
            await this.singleStepAsync()
            if (this.next()) {

            } else {
                
            }
        }
    }

    private set commandIndex(index: number) {
        if (index === undefined) {
            this._commandIndex = undefined
            this._currentCommand = undefined
        } else if (index !== this._commandIndex) {
            this._commandIndex = index
            this._currentCommand = new VMCommandRunner(
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

    private next() {
        if (
            this._currentCommand.status === VMStatus.Completed &&
            this.commandIndex < this.handler.commands.length - 1
        ) {
            this.commandIndex++
            return true
        }
        return false
    }

    // run-to-completion semantics
    async runToCompletion() {
        // handler stopped or/ empty
        if (this.stopped || !this.handler.commands.length) return
        this.trace("step begin")
        if (this.commandIndex === undefined) {
            this.commandIndex = 0
        }
        if (await this.singleStepBreakAsync()) return
        while (this.next()) {
            if (await this.singleStepBreakAsync()) return
        }
        this.trace("step end")
    }
}

export type WatchValueType = boolean | string | number

export class VMProgramRunner extends JDClient {
    private _handlers: VMHandlerRunner[] = []
    private _env: VMEnvironment
    private _waitQueue: VMHandlerRunner[] = []
    private _running = false
    private _in_run = false
    private _program: VMProgram
    private _watch: SMap<any> = {}
    private _breaks: SMap<boolean> = {}
    private _handlerAtBreak: VMHandlerRunner = undefined

    constructor(
        readonly bus: JDBus,
        readonly roleManager: RoleManager,
        prog: VMProgram
    ) {
        super()
        this._program = compileProgram(prog)
        const { registers, events, errors } = checkProgram(this._program)
        if (errors.length) {
            console.warn("ERRORS", errors)
        }
        // data structures for running program
        this._env = new VMEnvironment(registers, events)
        this._handlers = this._program.handlers.map(
            (h, index) => new VMHandlerRunner(this, index, this._env, h)
        )
        this._waitQueue = this._handlers.slice(0)
        // run on any change to environment
        this._env.subscribe(CHANGE, () => {
            try {
                this.run()
            } catch (e) {
                console.debug(e)
                this.emit(ERROR, e)
            }
        })
        // adding a (role,service) binding
        const addRoleService = (role: string) => {
            const service = this.roleManager.getService(role)
            if (service) {
                this._env.serviceChanged(role, service)
            }
        }
        // initialize
        this.roleManager.roles.forEach(r => {
            addRoleService(r.role)
        })
        // deal with bind/unbind
        this.mount(
            this.roleManager.subscribe(ROLE_BOUND, (role: string) => {
                console.log(`role added`, { role })
                addRoleService(role)
            })
        )
        this.mount(
            this.roleManager.subscribe(ROLE_UNBOUND, (role: string) => {
                console.log(`role removed`, { role })
                this._env.serviceChanged(role, undefined)
            })
        )
    }

    // debugging
    trace(message: string, context: VMTraceContext = {}) {
        this.emit(TRACE, { message, context })
    }

    watch(sourceId: string, value: WatchValueType) {
        const oldValue = this._watch[sourceId]
        if (oldValue !== value) {
            this._watch[sourceId] = value
            this.emit(VM_WATCH_CHANGE, sourceId)
        }
    }

    lookupWatch(sourceId: string) {
        return this._watch?.[sourceId]
    }

    setBreakpoints(breaks: string[]) {
        breaks.forEach(b => {
            this._breaks[b] = true
        })
    }

    clearBreakpoints(breaks: string[]) {
        if (breaks === undefined) {
            this._breaks = {}
        } else {
            breaks.forEach(b => {
                delete this._breaks[b]
            })
        }
    }

    breakPointOn(id: string) {
        return id in this._breaks
    }

    // control of VM
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

    start() {
        if (!this._program || this._running) return // already running
        this.trace("start")
        try {
            this.roleManager.setRoles(this._program.roles)
            this._running = true
            this._in_run = false
            this.run()
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    cancel() {
        if (!this._program || !this._running) return // nothing to cancel

        this._running = false
        this._waitQueue = this._handlers.slice(0)
        this._waitQueue.forEach(h => h.reset())
        this.emit(CHANGE)
        this.trace("cancelled")
    }

    step() {
        // TODO
    }

    private async run() {
        if (!this._program) return
        if (!this._running) return
        if (this._in_run) return
        this.trace("run")
        this._in_run = true
        let currentHandler: VMHandlerRunner = undefined
        try {
            await this._env.refreshRegistersAsync()
            if (this._waitQueue.length > 0) {
                const nextTime: VMHandlerRunner[] = []
                for (const h of this._waitQueue) {
                    currentHandler = h
                    await h.runToCompletion()
                    if (h.status === VMStatus.DebuggerBreak) {
                        this._handlerAtBreak = h
                        // TODO: what about other handlers?
                        // TODO: put breaks in them as well?
                    } else if (h.status !== VMStatus.Stopped) {
                        if (h.status === VMStatus.Completed) h.reset()
                        nextTime.push(h)
                    }
                    currentHandler = undefined
                }
                this._waitQueue = nextTime
                this._env.consumeEvent()
            } else {
                this.emit(CHANGE)
            }
        } catch (e) {
            if (currentHandler) {
                // program error in handler?
            }
            console.debug(e)
            this.emit(ERROR, e)
        }
        this._in_run = false
        this.trace("run end")
    }
}
