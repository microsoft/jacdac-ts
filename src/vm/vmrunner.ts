import { IT4Program, IT4Handler, IT4GuardedCommand } from "./ir"
import { VMRoleManagerEnvironment} from "./environment"

export enum VMCommandStatus {
    NotReady,
    Active,
    RequiresUserInput,
    Passed,
    Failed,
}

class IT4Evaluator {
    constructor(private readonly gc: IT4GuardedCommand) {

    }

    public get inst() {
        return (this.gc.command.callee as jsep.Identifier).name
    }

    public evaluate() {
        switch(this.inst) {
            case "awaitEvent":
            case "awaitCondition":
            case "writeRegister":
            case "writeLocal":
        }
    }

}

class  IT4CommandRunner {
    private _status = VMCommandStatus.NotReady
    constructor(private readonly env: VMRoleManagerEnvironment,
                private readonly gc: IT4GuardedCommand) {

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
            // this._commmandEvaluator.evaluate()
            // this.finish(this._commmandEvaluator.status)
        }
    }

    cancel() {
        this.finish(VMCommandStatus.Failed)
    }

    finish(s: VMCommandStatus) {
        if (
            this.isActive &&
            (s === VMCommandStatus.Failed ||
                s === VMCommandStatus.Passed)
        ) {
            this.status = s
            // this.testRunner.finishCommand()
        }
    }
}

class IT4HandlerRunner {
    private _status = VMCommandStatus.NotReady
    private _commandIndex: number
    private _currentEvent: string
    private _currentCommand: IT4CommandRunner;

    constructor(
        public readonly env: VMRoleManagerEnvironment,
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
        this.finish(VMCommandStatus.Failed)
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
        }
    }

    public envChange() {
        if (this.status === VMCommandStatus.Active) {
            // this.currentCommand?.envChange()
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