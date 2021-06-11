import { VMProgram, VMHandler, VMCommand, VMRole } from "./ir"
import RoleManager from "../servers/rolemanager"
import {
    VMEnvironment,
    VMEnvironmentException,
    VMEnvironmentCode,
} from "./environment"
import { VMExprEvaluator, unparse } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ROLE_BOUND, ROLE_UNBOUND, TRACE } from "../jdom/constants"
import { checkProgram, compileProgram } from "./compile"
import { VM_EVENT, VMCode } from "./events"
import { VMError, Mutex } from "./utils"
import { assert, SMap } from "../jdom/utils"
import { JDClient } from "../jdom/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VMTraceContext = any

enum VMInternalStatus {
    Ready = "ready", // the pc is at this instruction, but pre-condition not met
    Enabled = "enabled", // the instruction pre-conditions are met (is this needed?)
    Running = "running", // the instruction has started running (may need retries)
    Sleeping = "sleep", // waiting to be woken by timer
    Completed = "completed", // the instruction completed successfully
    Stopped = "stopped", // halt instruction encountered, handler stopped
}

const VM_WAKE_SLEEPER = "vmWakeSleeper"

export type atomic = string | boolean | number

export interface VMEnvironmentInterface {
    writeRegisterAsync: (
        e: jsep.MemberExpression | string,
        v: atomic
    ) => Promise<void>
    sendCommandAsync: (
        command: jsep.MemberExpression,
        values: atomic[]
    ) => Promise<void>
    refreshRegistersAsync: () => Promise<void>
    lookup: (e: jsep.MemberExpression | string) => atomic
    writeLocal: (e: jsep.MemberExpression | string, v: atomic) => boolean
    hasEvent: (e: jsep.MemberExpression | string) => boolean
    unsubscribe: () => void
}

class VMJumpException extends Error {
    constructor(public label: string) {
        super()
    }
}

class VMTimerException extends Error {
    constructor(public ms: number) {
        super()
    }
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

    public async evaluate(): Promise<VMInternalStatus> {
        if (!this._started) {
            const neededStart = this.start()
            this._started = true
            if (neededStart) return VMInternalStatus.Running
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
            return VMInternalStatus.Completed
        }
        switch (this.inst) {
            case "branchOnCondition": {
                const expr = this.checkExpression(args[0])
                if (expr) {
                    throw new VMJumpException((args[1] as jsep.Identifier).name)
                }
                return VMInternalStatus.Completed
            }
            case "jump": {
                throw new VMJumpException((args[0] as jsep.Identifier).name)
            }
            case "label": {
                return VMInternalStatus.Completed
            }
            case "awaitEvent": {
                const event = args[0] as jsep.MemberExpression
                if (this.env.hasEvent(event)) {
                    return this.checkExpression(args[1])
                        ? VMInternalStatus.Completed
                        : VMInternalStatus.Running
                }
                return VMInternalStatus.Running
            }
            case "awaitCondition": {
                return this.checkExpression(args[0])
                    ? VMInternalStatus.Completed
                    : VMInternalStatus.Running
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
                    return VMInternalStatus.Completed
                }
                return VMInternalStatus.Running
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
                return VMInternalStatus.Completed
            }
            case "watch": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                this.parent.watch(this.gc?.sourceId, ev)
                return VMInternalStatus.Completed
            }
            case "log": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                const evString = ev + ""
                this.parent.writeLog(this.gc?.sourceId, evString)
                console.log(evString)
                return VMInternalStatus.Completed
            }
            case "halt": {
                return VMInternalStatus.Stopped
            }
            case "nop": {
                return VMInternalStatus.Completed
            }
            case "wait": {
                const expr = new VMExprEvaluator(
                    e => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[0])
                throw new VMTimerException(ev * 1000)
            }
            case "onRoleConnected": {
                // first time fires based on state
                // after that, only on transitions
                return VMInternalStatus.Completed
            }
            case "onRoleDisonnected": {
                // first time fires based on state
                // after that, only on transitions
                return VMInternalStatus.Completed
            }
            default:
                throw new VMError(
                    VMCode.InternalError,
                    `Unknown instruction ${this.inst}`
                )
        }
    }
}

class VMCommandRunner {
    private _eval: VMCommandEvaluator
    private _status: VMInternalStatus = VMInternalStatus.Running
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

    writeLog(id: string, val: any) {
        this.parent.writeLog(id, val)
    }

    get status() {
        return this._status
    }

    set status(s: VMInternalStatus) {
        this._status = s
    }

    async stepAsync() {
        if (this.status === VMInternalStatus.Running) {
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

    writeLog(id: string, val: any) {
        this.parent.writeLog(id, val)
    }

    get status() {
        return this.stopped
            ? VMInternalStatus.Stopped
            : this._commandIndex === undefined
            ? VMInternalStatus.Ready
            : this._currentCommand.status === VMInternalStatus.Completed &&
              this._commandIndex < this.handler.commands.length - 1
            ? VMInternalStatus.Running
            : this._currentCommand.status
    }

    get command() {
        return this._currentCommand
    }

    get atTop() {
        return (
            this.status === VMInternalStatus.Running && this._commandIndex === 0
        )
    }

    gotoTop() {
        if (
            this.status === VMInternalStatus.Ready &&
            this.handler.commands.length
        )
            this.commandIndex = 0
    }

    reset() {
        this.commandIndex = undefined
        this.stopped = false
    }

    cancel() {
        this.stopped = true
        this.env.unsubscribe()
    }

    wake() {
        if (this._currentCommand) {
            this._currentCommand.status = VMInternalStatus.Completed
            this.next()
        }
    }

    // run-to-completion semantics
    // returns command if breakpoint encountered when not single stepping
    async runToCompletionAsync(singleStep = false) {
        if (this.stopped || !this.handler.commands.length) return undefined
        if (this.commandIndex === undefined) {
            this.commandIndex = 0
        }
        if ((await this.singleStepCheckBreakAsync(singleStep)) && !singleStep)
            return this._currentCommand
        while (this.next()) {
            if (singleStep || (await this.singleStepCheckBreakAsync()))
                return this._currentCommand
        }
        return undefined
    }

    private next() {
        if (
            this._currentCommand.status === VMInternalStatus.Completed &&
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
            throw new VMError(VMCode.InternalError, "ite not compiled away")
        }
        return cmd as VMCommand
    }

    private async singleStepCheckBreakAsync(singleStep = false) {
        this.trace("step begin")
        const sid = this._currentCommand.gc?.sourceId
        if (!singleStep && (await this.parent.breakpointOnAsync(sid))) {
            return true
        }
        await this.singleStepAsync()
        this.trace("step end")
        return false
    }

    private async singleStepAsync() {
        const sid = this._currentCommand.gc.sourceId
        this.parent.emit(VM_EVENT, VMCode.CommandStarted, sid)
        try {
            await this._currentCommand.stepAsync()
        } catch (e) {
            if (e instanceof VMJumpException) {
                const { label } = e as VMJumpException
                const index = this._labelToIndex[label]
                this.commandIndex = index
                this._currentCommand.status = VMInternalStatus.Completed
            } else if (e instanceof VMTimerException) {
                const vmt = e as VMTimerException
                this._currentCommand.status = VMInternalStatus.Sleeping
                await this.parent.sleepAsync(this, vmt.ms)
            } else {
                this.emit(
                    VM_EVENT,
                    VMCode.CommandFailed,
                    this._currentCommand.gc.sourceId
                )
                throw e
            }
        }
        if (this._currentCommand.status === VMInternalStatus.Completed)
            this.parent.emit(
                VM_EVENT,
                VMCode.CommandCompleted,
                this._currentCommand.gc.sourceId
            )
        if (this._currentCommand.status === VMInternalStatus.Stopped)
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
    ms: number
    handlerRunner: VMHandlerRunner
    handler?: VMHandler
    id: NodeJS.Timeout
}

function isEveryHandler(h: VMHandler) {
    assert(!!h)
    if (h.commands.length) {
        const cmd = (h.commands[0] as VMCommand).command
            .callee as jsep.Identifier
        return cmd.name === "wait"
    }
    return false
}

export enum VMStatus {
    Stopped = "stopped",
    Running = "running",
    Paused = "paused",
}
const MAX_LOG = 100
export class VMProgramRunner extends JDClient {
    // program, environment
    private _handlerRunners: VMHandlerRunner[] = []
    private _env: VMEnvironment
    private _roles: VMRole[] = []
    // running
    private _status: VMStatus
    private _waitQueue: VMHandlerRunner[] = []
    private _everyQueue: VMHandlerRunner[] = []
    private _runQueue: VMHandlerRunner[] = []
    private _waitRunMutex: Mutex
    private _sleepQueue: SleepingHandler[] = []
    private _sleepMutex: Mutex
    // debugging
    private _watch: SMap<any> = {}
    private _log: { text: string; count: number }[] = []
    private _breaks: SMap<boolean> = {}
    private _breaksMutex: Mutex

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
        this._status = VMStatus.Stopped
        this._env = new VMEnvironment(registers, events)
        this._handlerRunners = compiled.handlers.map(
            (h, index) => new VMHandlerRunner(this, index, this._env, h)
        )
        // TODO: can't add multiple handlers until we have deduplicate CHANGE on Event
        /*
        const len = this._handlerRunners.length
        compiled.handlers.forEach((h, index) =>
            this._handlerRunners.push(
                new VMHandlerRunner(this, len + index, this._env, h)
            )
        )*/

        this._waitRunMutex = new Mutex()
        this._breaksMutex = new Mutex()
        this._sleepMutex = new Mutex()
        // run on any change to environment
        this.mount(
            this._env.subscribe(CHANGE, () => {
                this.waitingToRunning()
            })
        )
        this.mount(
            this.subscribe(
                VM_WAKE_SLEEPER,
                async (h: VMHandlerRunner | VMHandler) => {
                    await this.wakeSleeper(h)
                }
            )
        )
        this.initializeRoleManagement()
    }

    // control of VM
    get status() {
        return this._status
    }

    get logData() {
        return this._log.slice(0)
    }

    private setStatus(s: VMStatus) {
        if (s !== this._status) {
            this._status = s
            this.emit(CHANGE)
        }
    }

    // debugging
    trace(message: string, context: VMTraceContext = {}) {
        this.emit(TRACE, { message, context })
    }

    watch(sourceId: string, value: WatchValueType) {
        this._watch[sourceId] = value
        this.emit(VM_EVENT, VMCode.WatchChange, sourceId)
    }

    writeLog(sourceId: string, value: WatchValueType) {
        const s = value + ""
        const last = this._log[this._log.length - 1]
        if (last?.text === s) last.count++
        else this._log.push({ text: value + "", count: 1 })
        while (this._log.length > MAX_LOG) this._log.shift()
        this.emit(VM_EVENT, VMCode.LogEntry, sourceId)
    }

    lookupWatch(sourceId: string) {
        return this._watch[sourceId]
    }

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

    // utility called by handlerRunner
    async sleepAsync(
        h: VMHandlerRunner,
        ms: number,
        handler: VMHandler = undefined
    ) {
        assert(h.status === VMInternalStatus.Sleeping)
        await this._sleepMutex.acquire(async () => {
            const id = setTimeout(() => {
                this.emit(VM_WAKE_SLEEPER, h ? h : handler)
            }, ms)
            this._sleepQueue.push({ ms, handlerRunner: h, id, handler })
        })
    }

    async startAsync() {
        if (this.status !== VMStatus.Stopped) return // already running
        this.trace("start")
        try {
            this.roleManager.setRoles(this._roles)
            await this._waitRunMutex.acquire(async () => {
                this._waitQueue = this._handlerRunners.slice(0)
                this._waitQueue.forEach(h => h.reset())
                this._runQueue = []
                this._everyQueue = []
                this.stopSleepers()
                // make sure to have another handler for every
                /*
                for (const h of this._waitQueue) {
                    if (isEveryHandler(h.handler)) {
                        const dup = new VMHandlerRunner(
                            this,
                            undefined,
                            this._env,
                            h.handler
                        )
                        dup.reset()
                        this._everyQueue.push(dup)
                    }
                }*/
            })
            this.clearBreakpointsAsync()
            this.setStatus(VMStatus.Running)
            this.waitingToRunning()
            this.runAsync()
        } catch (e) {
            console.debug(e)
            this.emit(VM_EVENT, VMCode.InternalError, e)
        }
    }

    cancel() {
        if (this.status === VMStatus.Stopped) return // nothing to cancel
        this.setStatus(VMStatus.Stopped)
        this.trace("cancelled")
    }

    async resumeAsync() {
        if (this.status !== VMStatus.Paused) return
        this.trace("resume")
        this.setStatus(VMStatus.Running)
        await this.runAsync()
    }

    private async getCurrentRunner() {
        return await this._waitRunMutex.acquire(async () => {
            if (this._runQueue.length) return this._runQueue[0]
            return undefined
        })
    }

    async stepAsync() {
        if (this.status !== VMStatus.Paused) return
        this.trace("step")
        const h = await this.getCurrentRunner()
        if (h) {
            await this.runHandlerAsync(h, true)
            await this.postProcessHandler(h)
            const newHead = await this.getCurrentRunner()
            if (newHead && newHead !== h) {
                this.emitBreakpoint(newHead)
            }
        }
    }

    private _in_run = false
    private async runAsync() {
        if (this.status === VMStatus.Stopped) return
        if (this._in_run) return
        this.trace("run")
        this._in_run = true
        try {
            await this._env.refreshRegistersAsync()
            let h: VMHandlerRunner = undefined
            while (
                this.status === VMStatus.Running &&
                (h = await this.getCurrentRunner())
            ) {
                assert(!h.atTop)
                await this.runHandlerAsync(h)
                await this.postProcessHandler(h)
            }
        } catch (e) {
            console.debug(e)
            this.emit(VM_EVENT, VMCode.InternalError, e)
        }
        this._in_run = false
        this.trace("run end")
    }

    private emitBreakpoint(h: VMHandlerRunner) {
        this.emit(
            VM_EVENT,
            VMCode.Breakpoint,
            h,
            h.status === VMInternalStatus.Completed
                ? ""
                : h.command.gc?.sourceId
        )
    }

    private async runHandlerAsync(h: VMHandlerRunner, oneStep = false) {
        try {
            const brkCommand = await h.runToCompletionAsync(oneStep)
            if ((brkCommand && !oneStep) || this.status === VMStatus.Paused) {
                this.setStatus(VMStatus.Paused)
                this.emitBreakpoint(h)
            }
            if (h.status === VMInternalStatus.Completed) {
                h.reset()
            }
        } catch (e) {
            if (e instanceof VMEnvironmentException) {
                const ex = e as VMEnvironmentException
                if (ex.code === VMEnvironmentCode.RoleNoService)
                    this.emit(
                        VM_EVENT,
                        VMCode.RoleMissing,
                        (e as VMEnvironmentException).data
                    )
            } else {
                console.debug(e)
                this.emit(VM_EVENT, VMCode.InternalError, e)
            }
            // on handler error, reset the handler
            h.reset()
        }
    }

    private async postProcessHandler(h: VMHandlerRunner) {
        if (
            h.status === VMInternalStatus.Ready ||
            h.status === VMInternalStatus.Sleeping ||
            h.status === VMInternalStatus.Stopped
        ) {
            let done: VMHandlerRunner = undefined
            await this._waitRunMutex.acquire(async () => {
                assert(!!this._runQueue.length)
                assert(h === this._runQueue[0])
                done = this._runQueue.shift()
                const moveToWait = h.status === VMInternalStatus.Ready
                if (moveToWait && !isEveryHandler(h.handler)) {
                    this._waitQueue.push(done)
                    done = undefined
                }
            })
            if (
                done &&
                h.status === VMInternalStatus.Ready &&
                isEveryHandler(h.handler)
            ) {
                if (this.status === VMStatus.Running)
                    await this.runHandlerAsync(h)
                else if (this.status === VMStatus.Paused) {
                    await this._waitRunMutex.acquire(async () => {
                        this._runQueue.unshift(h)
                        // this.emitBreakpoint(h)
                    })
                }
            }
        }
    }

    // call this whenever some event/change arises
    private async waitingToRunning() {
        if (this.status !== VMStatus.Stopped) {
            let waitCopy: VMHandlerRunner[] = undefined
            await this._waitRunMutex.acquire(async () => {
                if (this.status === VMStatus.Paused && this._runQueue.length)
                    return
                waitCopy = this._waitQueue.slice(0)
            })
            if (!waitCopy) return
            const handlersStarted: VMHandler[] = []
            const newRunners: VMHandlerRunner[] = []
            const sleepingRunners: VMHandlerRunner[] = []
            for (const h of waitCopy) {
                await this.runHandlerAsync(h, true)
                if (h.status === VMInternalStatus.Sleeping) {
                    sleepingRunners.push(h)
                } else if (
                    !h.atTop &&
                    handlersStarted.findIndex(hs => hs === h.handler) === -1
                ) {
                    newRunners.push(h)
                    handlersStarted.push(h.handler)
                }
            }
            await this._waitRunMutex.acquire(async () => {
                newRunners.forEach(h => {
                    this._runQueue.push(h)
                    const index = this._waitQueue.indexOf(h)
                    if (index >= 0) this._waitQueue.splice(index, 1)
                })
                sleepingRunners.forEach(h => {
                    const index = this._waitQueue.indexOf(h)
                    if (index >= 0) this._waitQueue.splice(index, 1)
                })
            })
            this._env.consumeEvent()
            this.runAsync()
        }
    }

    private async stopSleepers() {
        await this._sleepMutex.acquire(async () => {
            for (const s of this._sleepQueue) {
                clearTimeout(s.id)
            }
            this._sleepQueue = []
        })
    }

    private async wakeSleeper(h: VMHandlerRunner | VMHandler) {
        try {
            // let handlerMs: number = undefined
            let handlerRunner: VMHandlerRunner = undefined
            // let handler: VMHandler = undefined
            await this._sleepMutex.acquire(async () => {
                const index = this._sleepQueue.findIndex(
                    p => p?.handlerRunner === h // || p?.handler === h
                )
                assert(index >= 0)
                if (index >= 0) {
                    const p = this._sleepQueue[index]
                    //  handlerMs = p.ms
                    handlerRunner = p.handlerRunner
                    // handler = p?.handler
                    this._sleepQueue.splice(index, 1)
                    // clearTimeout(p.id)
                }
            })
            if (this.status === VMStatus.Stopped) return
            // this logic is to deal with starting a handler rather than a runner
            await this._waitRunMutex.acquire(async () => {
                /*
                if (!handlerRunner && isEveryHandler(handler)) {
                    const index = this._everyQueue.findIndex(
                        h => h.handler === handler
                    )
                    if (index >= 0) {
                        handlerRunner = this._everyQueue[index]
                        this._everyQueue.splice(index, 1)
                        handlerRunner.gotoTop()
                    }
                }*/
                if (handlerRunner) {
                    // transition to the run queue
                    handlerRunner.wake()
                    this._runQueue.push(handlerRunner)
                }
            })
            /*
            const theHandler = handlerRunner?.handler || handler
            if (isEveryHandler(theHandler)) {
                // setup next
                this.sleepAsync(undefined, handlerMs, theHandler)
            }*/
            if (handlerRunner) {
                if (this.status === VMStatus.Running) this.runAsync()
                else if (this.status === VMStatus.Paused) {
                    this.emitBreakpoint(await this.getCurrentRunner())
                }
            }
        } catch (e) {
            console.debug(e)
            this.emit(VM_EVENT, VMCode.InternalError, e)
        }
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
            this.roleManager.subscribe(ROLE_BOUND, async (role: string) => {
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
