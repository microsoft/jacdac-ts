import { IT4Program, IT4Handler, IT4GuardedCommand } from "./ir"
import { VMEnvironment } from "./environment"
import { JDExprEvaluator, unparse } from "./expr"
import { JDBus } from "../jdom/bus"
import { JDEventSource } from "../jdom/eventsource";

export enum VMStatus {
    Ready,
    Waiting,
    Completed,
    Stopped
}

interface Environment {
    lookup: (e: jsep.MemberExpression | string) => any
    writeRegister: (e: jsep.MemberExpression | string, v: any) => boolean
    writeLocal: (e: jsep.MemberExpression | string, v: any) => boolean
    hasEvent: (e: jsep.MemberExpression | string) => boolean
    refreshEnvironment: () => void
    unsubscribe: () => void
}

class IT4CommandEvaluator {
    private _status: VMStatus;
    constructor(
        private readonly env: Environment,
        private readonly gc: IT4GuardedCommand) {

    }

    get status() {
        return this._status
    }

    private get inst() {
        return (this.gc.command.callee as jsep.Identifier).name
    }

    private checkExpression(e: jsep.Expression) {
        const expr = new JDExprEvaluator((e) => this.env.lookup(e), undefined)
        return expr.eval(e) ? true : false
    }

    public evaluate() {
        console.log(unparse(this.gc.command))
        this._status = VMStatus.Waiting
        const args = this.gc.command.arguments
        switch(this.inst) {
            case "awaitEvent": {
                const event = args[0] as jsep.MemberExpression
                if (this.env.hasEvent(event)) {
                    this._status = this.checkExpression(args[1]) ? VMStatus.Completed : VMStatus.Waiting;
                }
                break
            }
            case "awaitCondition": {
                this._status = this.checkExpression(args[0]) ? VMStatus.Completed : VMStatus.Waiting;
                break
            }
            case "writeRegister": 
            case "writeLocal": 
            {
                const expr = new JDExprEvaluator(
                    (e) => this.env.lookup(e),
                    undefined
                )
                const ev = expr.eval(args[1])
                const reg = args[0] as jsep.MemberExpression
                if (this.inst === "writeRegister" && this.env.writeRegister(reg, ev) ||
                    this.inst === "writeLocal" && this.env.writeLocal(reg, ev)
                ) {
                    this._status = VMStatus.Completed
                }
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

class  IT4CommandRunner {
    private _status = VMStatus.Waiting
    private _eval: IT4CommandEvaluator;
    constructor(env: Environment, gc: IT4GuardedCommand) {
        this._eval = new IT4CommandEvaluator(env, gc)
    }

    get status() {
        return this._status
    }

    set status(s: VMStatus) {
        if (s != this._status) {
            this._status = s
        }
    }

    get isWaiting(): boolean {
        return (
            this.status === VMStatus.Waiting
        )
    }

    reset() {
        this.status = VMStatus.Waiting
    }

    step() {
        if (this.isWaiting) {
            this._eval.evaluate()
            this.finish(this._eval.status)
        }
    }

    cancel() {
        this.finish(VMStatus.Stopped)
    }

    private finish(s: VMStatus) {
        if (
            this.isWaiting &&
            s === VMStatus.Completed || s === VMStatus.Stopped
        ) {
            this.status = s
        }
    }
}

class IT4HandlerRunner {
    private _commandIndex: number
    private _currentCommand: IT4CommandRunner;
    private stopped: boolean = false;

    constructor(
        public readonly id: number, 
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        this.reset()
    }

    get status() {
        return this.stopped ? VMStatus.Stopped :
            this._currentCommand === undefined ? VMStatus.Ready : this._currentCommand.status
    }

    public reset() {
        this._commandIndex = undefined
        this._currentCommand = undefined
        this.stopped = false
    }

    cancel() {
        this.stopped = true
        this.env.unsubscribe();
    }
    
    private post_process() {
        if (this._currentCommand.status === VMStatus.Stopped)
            this.stopped = true
    }

    // run-to-completion semantics
    step() {
        if (this.stopped)
            return
        if (this._commandIndex === undefined) {
            this._commandIndex = 0
            this._currentCommand = new IT4CommandRunner(this.env, this.handler.commands[this._commandIndex])
        }
        this._currentCommand.step()
        this.post_process()
        console.log(`IT4HandlerRunner${this.id}.step: ${this._commandIndex}`)
        while (this._currentCommand.status === VMStatus.Completed &&
               this._commandIndex < this.handler.commands.length - 1) {
            this._commandIndex++
            this._currentCommand = new IT4CommandRunner(this.env, this.handler.commands[this._commandIndex])
            this._currentCommand.step()
            this.post_process()
            console.log(`IT4HandlerRunner${this.id}.step: ${this._commandIndex}`)
        }
    }
}

export class IT4ProgramRunner extends JDEventSource {
    private _handlers: IT4HandlerRunner[]
    private _env: VMEnvironment
    private _waitQueue: IT4HandlerRunner[] = []
    private _running = false

    constructor(program: IT4Program, bus: JDBus) {
        super()
        this._env = new VMEnvironment(bus, () => { this.run() })
        this._handlers = program.handlers.map((h,index) => new IT4HandlerRunner(index, this._env, h))
        this._waitQueue = this._handlers.slice(0)
    }

    get status() {
        return this._running === false ? VMStatus.Ready :
            this._waitQueue.length > 0 ? VMStatus.Waiting : VMStatus.Completed 
    }

    cancel() {
        console.log("VM stop")
        this._running = false
        this._waitQueue = this._handlers.slice(0)
        this._waitQueue.forEach(h => h.reset())
        console.log(this._running)
    }

    start() {
        console.log("VM start")
        this._running = true
        this.run()
    }

    run() {
        if (!this._running)
            return
        console.log("run")
        this._env.refreshEnvironment()
        if (this._waitQueue.length > 0) {
            let nextTime: IT4HandlerRunner[] = []
            this._waitQueue.forEach(h => {
                h.step()
                if (h.status !== VMStatus.Stopped) {
                    if (h.status === VMStatus.Completed)
                        h.reset()
                    nextTime.push(h)
                }
            })
            this._waitQueue = nextTime
            this._env.consumeEvent()
        }
    }
}