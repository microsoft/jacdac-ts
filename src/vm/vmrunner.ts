import { IT4Program, IT4Handler, IT4GuardedCommand } from "./ir"
import { MyRoleManager } from "./rolemanager"
import { VMEnvironment } from "./environment"
import { JDExprEvaluator } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource"
import { CHANGE, ERROR } from "../jdom/constants"
import { checkProgram } from "./ir"
import { JACDAC_ROLE_SERVICE_BOUND, JACDAC_ROLE_SERVICE_UNBOUND } from "./utils"

export enum VMStatus {
    Ready = "ready",
    Running = "running",
    Completed = "completed",
    Stopped = "stopped",
}

interface Environment {
    writeRegisterAsync: (e: jsep.MemberExpression | string, v: any) => Promise<void>
    sendCommandAsync: (command: jsep.MemberExpression, values: any[]) => Promise<void>
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
        private readonly env: Environment,
        private readonly gc: IT4GuardedCommand
    ) {}

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
        if (this.gc.command.callee.type !== "MemberExpression" &&
            (this.inst === "awaitRegister" || this.inst === "awaitChange")) {
                // need to capture register value for awaitChange/awaitRegister
                const args = this.gc.command.arguments
                this._regSaved = this.evalExpression(args[0])
                if (this.inst === "awaitChange")
                    this._changeSaved = this.evalExpression(args[1])
        }
    }

    public async evaluate() {
        this._status = VMStatus.Running
        if (!this._started) {
            this.start()
            this._started = true
            return
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
                if (this.inst === "awaitRegister" && regValue !== this._regSaved ||
                    this.inst === "awaitChange" &&
                        (this._changeSaved === 0 && regValue !== this._regSaved ||
                         this._changeSaved < 0 && regValue <= this._regSaved + this._changeSaved ||
                         this._changeSaved > 0 && regValue >= this._regSaved + this._changeSaved)) {
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
                const reg = args[0] as jsep.MemberExpression
                if (this.inst === "writeRegister")
                    await this.env.writeRegisterAsync(reg, ev)
                else   
                    this.env.writeLocal(reg, ev)
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
    constructor(env: Environment, gc: IT4GuardedCommand) {
        this._eval = new IT4CommandEvaluator(env, gc)
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
                await this._eval.evaluate()
                this.finish(this._eval.status)
            } catch (e) {
                console.debug(e)
            }
        }
    }

    cancel() {
        this.finish(VMStatus.Stopped)
    }

    private finish(s: VMStatus) {
        if (
            (this.isWaiting && s === VMStatus.Completed) ||
            s === VMStatus.Stopped
        ) {
            this.status = s
        }
    }
}

class IT4HandlerRunner {
    private _commandIndex: number
    private _currentCommand: IT4CommandRunner
    private stopped = false

    constructor(
        public readonly id: number,
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        this.reset()
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
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
    }

    // run-to-completion semantics
    async step() {
        // handler stopped or empty
        if (this.stopped || !this.handler.commands.length) return

        if (this._commandIndex === undefined) {
            this._commandIndex = 0
            this._currentCommand = new IT4CommandRunner(
                this.env,
                this.handler.commands[this._commandIndex]
            )
        }
        await this._currentCommand.step()
        this.post_process()
        while (
            this._currentCommand.status === VMStatus.Completed &&
            this._commandIndex < this.handler.commands.length - 1
        ) {
            this._commandIndex++
            this._currentCommand = new IT4CommandRunner(
                this.env,
                this.handler.commands[this._commandIndex]
            )
            await this._currentCommand.step()
            this.post_process()
        }
    }
}

export class IT4ProgramRunner extends JDEventSource {
    private _handlers: IT4HandlerRunner[]
    private _env: VMEnvironment
    private _waitQueue: IT4HandlerRunner[] = []
    private _running = false
    private _rm: MyRoleManager

    constructor(private readonly program: IT4Program, bus: JDBus) {
        super()
        try {
            const [regs, events] = checkProgram(program)
            if (program.errors.length > 0) {
                console.debug(program.errors)
            }
            this._rm = new MyRoleManager(bus, (role, service, added) => {
                try {
                    this._env.serviceChanged(role, service, added)
                    if (added) {
                        this.emit(JACDAC_ROLE_SERVICE_BOUND, service)
                        this.program.handlers.forEach(h => {
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
                    }
                } catch (e) {
                    console.debug(e)
                    this.emit(ERROR, e)
                }
            })
            this._env = new VMEnvironment(async () => {
                try {
                    await this.run()
                } catch (e) {
                    console.debug(e)
                    this.emit(ERROR, e)
                }
            })
            this._handlers = program.handlers.map(
                (h, index) => new IT4HandlerRunner(index, this._env, h)
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
    }

    async start() {
        if (this._running) return // already running
        try {
            this.program.roles.forEach(role => {
                this._rm.addRoleService(role.role, role.serviceShortName)
            })
            this._running = true
            this.emit(CHANGE)
            await this.run()
        } catch (e) {
            this.emit(ERROR, e)
        }
    }

    async run() {
        if (!this._running) return
        try {
            await this._env.refreshRegistersAsync()
            if (this._waitQueue.length > 0) {
                const nextTime: IT4HandlerRunner[] = []
                for(const h of this._waitQueue) {
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
    }
}
