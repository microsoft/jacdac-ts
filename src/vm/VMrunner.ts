import { VMProgram, VMHandler, VMCommand, VMRole } from "./VMir"
import { RoleManager, ROLE_BOUND, ROLE_UNBOUND } from "./rolemanager"
import { VMEnvironment } from "./VMenvironment"
import { VMExprEvaluator, unparse } from "./VMexpr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ERROR, TRACE } from "../jdom/constants"
import { checkProgram, compileProgram } from "./VMir"
import {
    VM_COMMAND_ATTEMPTED,
    VM_COMMAND_COMPLETED,
    VM_WATCH_CHANGE,
    VMError,
    VM_BREAKPOINT,
} from "./VMutils"
import { SMap } from "../jdom/utils"
import { JDClient } from "../jdom/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VMTraceContext = any

export enum VMStatus {
    Ready = "ready", // the pc is at this instruction, but pre-condition not met
    Enabled = "enabled", // the instruction pre-conditions are met (is this needed?)
    Running = "running", // the instruction has started running (may need retries)
    Completed = "completed", // the instruction completed successfully
    Stopped = "stopped", // halt instruction encountered, handler stopped
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

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
        const expr = new VMExprEvaluator(e => this.env.lookup(e), undefined)
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
            const expr = new VMExprEvaluator(e => this.env.lookup(e), undefined)
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
                const expr = new VMExprEvaluator(
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
                const expr = new VMExprEvaluator(
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
            case "nop": {
                this._status = VMStatus.Completed
                break
            }
            case "wait": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                await delay(ev * 1000)
                this._status = VMStatus.Completed
                break
            }
            default:
                throw new VMError(`Unknown instruction ${this.inst}`)
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

    async stepAsync() {
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
    private _commandIndex: number = undefined
    private _currentCommand: VMCommandRunner = undefined
    private stopped = false
    private _labelToIndex: SMap<number> = {}
    private _breakRequested = false
    private _singleStep = false

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

    reset() {
        this.commandIndex = undefined
        this.stopped = false
    }

    cancel() {
        this.stopped = true
        this.env.unsubscribe()
    }

    requestBreak() {
        this._breakRequested = true
    }

    resume() {
        this._singleStep = false
    }

    // run-to-completion semantics (true if breakpoint)
    async runToCompletionAsync() {
        if (this.stopped || !this.handler.commands.length) return undefined
        if (this.commandIndex === undefined) {
            this.commandIndex = 0
        }
        if ((await this.singleStepCheckBreakAsync()) || this._singleStep)
            return this._currentCommand
        while (this.next()) {
            if ((await this.singleStepCheckBreakAsync()) || this._singleStep)
                return this._currentCommand
        }
        return undefined
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

    private getCommand() {
        const cmd = this.handler.commands[this._commandIndex]
        if (cmd.type === "ite") {
            throw new VMError("ite not compiled away")
        }
        return cmd as VMCommand
    }

    private async singleStepCheckBreakAsync() {
        this.trace("step begin")
        const sid = this._currentCommand.gc?.sourceId
        if (this.parent.breakpointOn(sid) || this._breakRequested) {
            this._singleStep = true
            this._breakRequested = false
            return true
        }
        await this.singleStepAsync()
        this.trace("step end")
        return false
    }

    private async singleStepAsync() {
        const sid = this._currentCommand.gc.sourceId
        this.emit(VM_COMMAND_ATTEMPTED, sid)
        try {
            await this._currentCommand.stepAsync()
        } catch (e) {
            if (e instanceof VMJumpException) {
                const { label } = e as VMJumpException
                const index = this._labelToIndex[label]
                this.commandIndex = index
                // since it's a label it executes successfully
                this._currentCommand.status = VMStatus.Completed
            } else {
                if (e instanceof VMError) throw e
                else throw new VMError(e.message)
            }
        }
        if (this._currentCommand.status === VMStatus.Completed)
            this.emit(VM_COMMAND_COMPLETED, this._currentCommand.gc.sourceId)
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
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
}

export type WatchValueType = boolean | string | number

export class VMProgramRunner extends JDClient {
    private _handlers: VMHandlerRunner[] = []
    private _env: VMEnvironment
    private _waitQueue: VMHandlerRunner[] = []
    private _running = false
    private _in_run = false
    private _watch: SMap<any> = {}
    private _breaks: SMap<boolean> = {}
    private _roles: VMRole[] = []
    private _handlerAtBreak: VMHandlerRunner = undefined

    constructor(
        readonly bus: JDBus,
        readonly roleManager: RoleManager,
        prog: VMProgram
    ) {
        super()
        const compiled = compileProgram(prog)
        const { registers, events, errors } = checkProgram(compiled)
        this._roles = compiled.roles
        if (errors.length) {
            console.warn("ERRORS", errors)
        }
        // data structures for running program
        this._env = new VMEnvironment(registers, events)
        this._handlers = compiled.handlers.map(
            (h, index) => new VMHandlerRunner(this, index, this._env, h)
        )
        this._waitQueue = this._handlers.slice(0)
        // run on any change to environment
        this._env.subscribe(CHANGE, () => {
            this.runWithTry()
        })
        // adding a (role,service) binding
        const addRoleService = (role: string) => {
            const service = this.roleManager.getService(role)
            if (service) {
                console.log(`role added`, { role })
                this._env.serviceChanged(role, service)
            }
        }
        // initialize
        this.roleManager.roles.forEach(r => {
            if (this._roles.find(rv => rv.role === r.role)) {
                addRoleService(r.role)
            }
        })

        this.mount(
            this.roleManager.subscribe(ROLE_BOUND, (role: string) => {
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

    // watch statement - watch an expression
    watch(sourceId: string, value: WatchValueType) {
        const oldValue = this._watch[sourceId]
        if (oldValue !== value) {
            this._watch[sourceId] = value
            this.emit(VM_WATCH_CHANGE, sourceId)
        }
    }

    lookupWatch(sourceId: string) {
        return this._watch[sourceId]
    }

    // breakpoints
    setBreakpoints(breaks: string[]) {
        this.clearBreakpoints()
        breaks.forEach(b => {
            this._breaks[b] = true
        })
    }

    clearBreakpoints() {
        this._breaks = {}
    }

    breakpointOn(id: string) {
        return !!this._breaks?.[id]
    }

    // control of VM
    get status() {
        const ret =
            this._running === false
                ? VMStatus.Stopped
                : this._waitQueue.length > 0
                ? VMStatus.Running
                : VMStatus.Completed
        return ret
    }

    start() {
        if (this._running) return // already running
        this.trace("start")
        try {
            this.roleManager.setRoles(this._roles)
            this._running = true
            this._in_run = false
            this.run()
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    cancel() {
        if (!this._running) return // nothing to cancel

        this._running = false
        this._waitQueue = this._handlers.slice(0)
        this._waitQueue.forEach(h => h.reset())
        this.emit(CHANGE)
        this.trace("cancelled")
    }

    resume() {
        if (!this._running) return
        this.trace("resume")
        this._handlerAtBreak = undefined
        this._handlers.forEach(h => h.resume())
        this.runWithTry()
    }

    step() {
        if (!this._running || !this._handlerAtBreak) return
        this.trace("step")
        this.runWithTry()
    }

    private runWithTry() {
        try {
            this.run()
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    private async runHandler(h: VMHandlerRunner) {
        if (!this._handlerAtBreak || this._handlerAtBreak === h) {
            const brkCommand = await h.runToCompletionAsync()
            if (brkCommand) {
                this._handlerAtBreak = h
                this.emit(VM_BREAKPOINT, {
                    handler: h,
                    sourceId: brkCommand.gc?.sourceId,
                })
            }
            if (h.status !== VMStatus.Stopped) {
                if (h.status === VMStatus.Completed) {
                    h.reset()
                }
                return true
            } else return false
        } else {
            // skip execution of handler h
            return true
        }
    }

    private async run() {
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
                    const result = await this.runHandler(h)
                    if (result) nextTime.push(h)
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
