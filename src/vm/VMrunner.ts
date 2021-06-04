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
    VM_WAKE_SLEEPER,
    Mutex
} from "./VMutils"
import { SMap } from "../jdom/utils"
import { JDClient } from "../jdom/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VMTraceContext = any

export enum VMStatus {
    Ready = "ready", // the pc is at this instruction, but pre-condition not met
    Enabled = "enabled", // the instruction pre-conditions are met (is this needed?)
    Running = "running", // the instruction has started running (may need retries)
    Sleeping = "sleep", // waiting to be woken by timer
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

class VMTimerException {
    constructor(public ms: number) {}
}

class VMCommandEvaluator {
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

    public async evaluate(): Promise<VMStatus> {
        if (!this._started) {
            const neededStart = this.start()
            this._started = true
            if (neededStart) return VMStatus.Running
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
            return VMStatus.Completed
        }
        switch (this.inst) {
            case "branchOnCondition": {
                const expr = this.checkExpression(args[0])
                if (expr) {
                    throw new VMJumpException((args[1] as jsep.Identifier).name)
                }
                return VMStatus.Completed
            }
            case "jump": {
                throw new VMJumpException((args[0] as jsep.Identifier).name)
            }
            case "label": {
                return VMStatus.Completed
            }
            case "awaitEvent": {
                const event = args[0] as jsep.MemberExpression
                if (this.env.hasEvent(event)) {
                    return this.checkExpression(args[1])
                        ? VMStatus.Completed
                        : VMStatus.Running
                }
                return VMStatus.Running
            }
            case "awaitCondition": {
                return this.checkExpression(args[0])
                    ? VMStatus.Completed
                    : VMStatus.Running
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
                    return VMStatus.Completed
                }
                return VMStatus.Running
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
                return VMStatus.Completed
            }
            case "watch": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                this.parent.watch(this.gc?.sourceId, ev)
                return VMStatus.Completed
            }
            case "halt": {
                return VMStatus.Stopped
            }
            case "nop": {
                return VMStatus.Completed
            }
            case "wait": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                throw new VMTimerException(ev * 1000)
            }
            default:
                throw new VMError(`Unknown instruction ${this.inst}`)
        }
    }
}

class VMCommandRunner {
    private _eval: VMCommandEvaluator
    private _status: VMStatus = VMStatus.Running
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
        this._status = s
    }

    async stepAsync() {
        if (this.status === VMStatus.Running) {
            this.trace(unparse(this.gc.command))
            this.status = await this._eval.evaluate()
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
        public readonly handler: VMHandler
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

    wake() {
        if (this._currentCommand) {
            this._currentCommand.status = VMStatus.Completed
        }
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
        if (await this.parent.breakpointOnAsync(sid) || this._breakRequested) {
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
                this._currentCommand.status = VMStatus.Completed
            } else if (e instanceof VMTimerException) {
                let vmt = e as VMTimerException
                this._currentCommand.status = VMStatus.Sleeping
                await this.parent.sleepAsync(this, vmt.ms)
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

interface SleepingHandler {
    handler: VMHandlerRunner
    id: NodeJS.Timeout
}

function isEveryHandler(h: VMHandlerRunner) {
    if (h.handler.commands.length) {
        const cmd = (h.handler.commands[0] as VMCommand).command.callee  as jsep.Identifier
        return cmd.name === "wait"
    }
    return false
}

export class VMProgramRunner extends JDClient {
    private _handlers: VMHandlerRunner[] = []
    private _env: VMEnvironment
    private _running = false
    private _in_run = false
    private _watch: SMap<any> = {}
    private _roles: VMRole[] = []
    private _handlerAtBreak: VMHandlerRunner = undefined
    // stated accessed concurrently
    private _waitQueue: VMHandlerRunner[] = []
    private _waitMutex: Mutex
    private _breaks: SMap<boolean> = {}
    private _breaksMutex: Mutex
    private _sleepQueue: SleepingHandler[] = []
    private _sleepMutex: Mutex

    constructor(
        readonly bus: JDBus,
        readonly roleManager: RoleManager,
        readonly program: VMProgram
    ) {
        super()
        const compiled = compileProgram(program)
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
        this._waitMutex = new Mutex()
        this._breaksMutex = new Mutex()
        this._sleepMutex= new Mutex()
        // run on any change to environment
        this.mount(
            this._env.subscribe(CHANGE, () => {
                this.runWithTry()
            })
        )
        this.mount(
            this.subscribe(VM_WAKE_SLEEPER, async (h: VMHandlerRunner) => {
                try {
                    await this._sleepMutex.acquire(async () => {
                        const index = this._sleepQueue.findIndex(p => p.handler === h)
                        if (index >= 0) {
                            const { id } = this._sleepQueue[index]
                            this._sleepQueue.splice(index)
                            clearTimeout(id)
                        }
                    })
                    h.wake()
                    const result = await this.runHandler(h)
                    if (result && !isEveryHandler(h)) {
                        await this._waitMutex.acquire(async () => {
                            this._waitQueue.push(h)
                        })
                    }
                } catch (e) {
                    console.debug(e)
                }
            })
        )
        this.initializeRoleManagement();
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
    async setBreakpointsAsync(breaks: string[]) {
        await this._breaksMutex.acquire(async () => {
            this._breaks = {}
            breaks.forEach(b => {
                this._breaks[b] = true
            })
        })
    }

    async clearBreakpointsAsync() {
        await this._breaksMutex.acquire(async () => {
            this._breaks = {}
        })
    }

    async breakpointOnAsync(id: string) {
        let ret = false
        await this._breaksMutex.acquire(async () => {
            ret = !!this._breaks?.[id]
        })
        return ret
    }
    
    // timers
    async sleepAsync(handler: VMHandlerRunner, ms: number) {  
        await this._sleepMutex.acquire(async () => {
            let id = setTimeout(() => { 
                this.emit(VM_WAKE_SLEEPER, handler)
            }, ms)
            this._sleepQueue.push({handler, id})
        })
    }

    // control of VM
    async statusAsync() {
        let len = 0
        await this._waitMutex.acquire(async () => {
            len = this._waitQueue.length
        });
        const ret =
            this._running === false
                ? VMStatus.Stopped
                : len > 0
                ? VMStatus.Running
                : VMStatus.Completed
        return ret
    }

    async startAsync() {
        if (this._running) return // already running
        this.trace("start")
        try {
            this.roleManager.setRoles(this._roles)
            this._running = true
            this._in_run = false
            await this._waitMutex.acquire(async () => {
                this._waitQueue = this._handlers.slice(0)
                this._waitQueue.forEach(h => h.reset())
            });
            this.run()
        } catch (e) {
            console.debug(e)
            this.emit(ERROR, e)
        }
    }

    cancel() {
        if (!this._running) return // nothing to cancel
        this._running = false
        this.emit(CHANGE)
        this.trace("cancelled")
    }

    async resumeAsync() {
        if (!this._running) return
        this.trace("resume")
        this._handlerAtBreak = undefined
        await this._waitMutex.acquire(async () => {
            this._waitQueue.forEach(h => h.resume())
        })
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
                this.emit(VM_BREAKPOINT, h, brkCommand.gc?.sourceId)
            }
            if (h.status !== VMStatus.Stopped) {
                if (h.status === VMStatus.Completed) {
                    h.reset()
                    if (isEveryHandler(h)) {
                        this.sleepAsync(h, 1)
                    }
                }
                return h.status !== VMStatus.Sleeping
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
            let waitCopy: VMHandlerRunner[] = []
            await this._waitMutex.acquire(async () => {
                waitCopy = this._waitQueue.slice()
                this._waitQueue = []
            })
            if (waitCopy.length > 0) {
                const nextTime: VMHandlerRunner[] = []
                for (const h of waitCopy) {
                    currentHandler = h
                    const result = await this.runHandler(h)
                    if (result) nextTime.push(h)
                    currentHandler = undefined
                }
                await this._waitMutex.acquire(async () => {
                    nextTime.forEach(h => this._waitQueue.push(h))
                })
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

    private initializeRoleManagement() {
        // adding a (role,service) binding
        const addRoleService = (role: string) => {
            const service = this.roleManager.getService(role)
            if (service) {
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
                this._env.serviceChanged(role, undefined)
            })
        )
    }

}
