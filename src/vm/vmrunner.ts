import { IT4Program, IT4Handler, IT4GuardedCommand } from "./ir"
import { VMRoleManagerEnvironment} from "./environment"
import { JDExprEvaluator } from "./expr"

export enum VMCommandStatus {
    NotReady,
    Active,
    Completed,
    Stopped
}

interface Environment {
    lookup: (e: jsep.MemberExpression | string) => any
    writeRegister: (e: jsep.MemberExpression | string, v: any) => boolean
    writeLocal: (e: jsep.MemberExpression | string, v: any) => boolean
    hasEvent: (e: jsep.MemberExpression | string) => boolean
}

class IT4Evaluator {
    private _status = VMCommandStatus.NotReady
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
        const expr = new JDExprEvaluator(this.env.lookup, undefined)
        return expr.eval(e)
            ? VMCommandStatus.Completed
            : VMCommandStatus.Active
    }

    public evaluate() {
        this._status = VMCommandStatus.Active
        const args = this.gc.command.arguments
        switch(this.inst) {
            case "awaitEvent": {
                const event = args[0] as jsep.MemberExpression
                if (this.env.hasEvent(event)) {
                    this._status = this.checkExpression(args[1])
                }
                break
            }
            case "awaitCondition": {
                this._status = this.checkExpression(args[0])
                break
            }
            case "writeRegister": 
            case "writeLocal": 
            {
                const expr = new JDExprEvaluator(
                    this.env.lookup,
                    undefined
                )
                const ev = expr.eval(args[1])
                const reg = args[0] as jsep.MemberExpression
                if (this.inst === "writeRegister" && this.env.writeRegister(reg, ev) ||
                    this.inst === "writeLocal" && this.env.writeLocal(reg, ev)
                ) {
                    this._status = VMCommandStatus.Completed
                }
                this._status = VMCommandStatus.Completed
                break
            }
            case "halt": {
                this._status = VMCommandStatus.Stopped
                break
            }
        }
    }

}

class  IT4CommandRunner {
    private _status = VMCommandStatus.NotReady
    private _eval: IT4Evaluator;
    constructor(private readonly env: Environment,
                private readonly gc: IT4GuardedCommand) {
        this._eval = new IT4Evaluator(env, gc)
    }

    start() {
        this.status = VMCommandStatus.Active
        this.envChange()
    }

    get status() {
        return this._status
    }

    set status(s: VMCommandStatus) {
        if (s != this._status) {
            this._status = s
        }
    }

    get isActive(): boolean {
        return (
            this.status === VMCommandStatus.Active
        )
    }

    reset() {
        this.status = VMCommandStatus.NotReady
    }

    envChange() {
        if (this.isActive) {
            this._eval.evaluate()
            this.finish(this._eval.status)
        }
    }

    cancel() {
        this.finish(VMCommandStatus.Stopped)
    }

    finish(s: VMCommandStatus) {
        if (
            this.isActive &&
            s === VMCommandStatus.Completed
        ) {
            this.status = s
        }
    }
}

class IT4HandlerRunner {
    private _status = VMCommandStatus.NotReady
    private _commandIndex: number
    private _currentEvent: string
    private _currentCommand: IT4CommandRunner;

    constructor(
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        
    }

    public reset() {
        if (this.status !== VMCommandStatus.NotReady) {
            this._status = VMCommandStatus.NotReady
            this._commandIndex = undefined
            this._currentEvent = undefined
        }
    }

    start() {
        this.reset()
        this.status = VMCommandStatus.Active
        this.commandIndex = 0
    }

    cancel() {
        this.finish(VMCommandStatus.Stopped)
    }

    get status() {
        return this._status
    }

    set status(s: VMCommandStatus) {
        if (s != this._status) {
            this._status = s
        }
    }

    finish(newStatus: VMCommandStatus) {
        if (this.status === VMCommandStatus.Active) {
            this.status = newStatus
            // TODO: if finished
        }
    }

    private get commandIndex() {
        return this._commandIndex
    }

    private set commandIndex(index: number) {
        if (this._commandIndex !== index) {
            this._commandIndex = index
            this._currentCommand = new IT4CommandRunner(this.env, this.handler.commands[index])
            this._currentCommand.start()
            // check status
        }
    }

    public envChange() {
        if (this.status === VMCommandStatus.Active) {
            this.currentCommand?.envChange()
            // check status
        }
    }

    public eventChange(event: string) {
        if (this.status === VMCommandStatus.Active) {
            this._currentEvent = event
            this.envChange()
        }
    }

    public get hasEvent() {
        return this._currentEvent != undefined
    }

    public consumeEvent() {
        const ret = this._currentEvent
        this._currentEvent = undefined
        return ret
    }

    public finishCommand() {
        if (this.commandIndex === this.handler.commands.length -1)
            this.finish(this.currentCommand.status)
        else 
            this.commandIndex++
    }

    get currentCommand(): any {
        return this._currentCommand
    }
}

export class IT4ProgramRunner {
    private _handlers: IT4HandlerRunner[];

    constructor(private env: VMRoleManagerEnvironment, private readonly program: IT4Program) {
        // start all the handlers (in parallel)
        this._handlers = program.handlers.map(h => new IT4HandlerRunner(env, h))
        this._handlers.forEach(h => h.start())
    }
}