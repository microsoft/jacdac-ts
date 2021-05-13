import { IT4Program, IT4Handler, IT4GuardedCommand } from "./ir"
import { VMRoleManagerEnvironment } from "./environment"
import { JDExprEvaluator } from "./expr"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"

export enum VMStatus {
    Paused,
    Waiting,
    Completed,
    Stopped
}

interface Environment {
    lookup: (e: jsep.MemberExpression | string) => any
    writeRegister: (e: jsep.MemberExpression | string, v: any) => boolean
    writeLocal: (e: jsep.MemberExpression | string, v: any) => boolean
    hasEvent: (e: jsep.MemberExpression | string) => boolean
}

class IT4CommandEvaluator {
    private _status = VMStatus.Paused
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
        return expr.eval(e) ? true : false
    }

    public evaluate() {
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
                    this.env.lookup,
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
    private _status = VMStatus.Paused
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

    get isReady(): boolean {
        return (
            this.status === VMStatus.Waiting ||
            this.status === VMStatus.Paused
        )
    }

    reset() {
        this.status = VMStatus.Paused
    }

    step() {
        if (this.isReady) {
            this._eval.evaluate()
            this.finish(this._eval.status)
        }
    }

    cancel() {
        this.finish(VMStatus.Stopped)
    }

    private finish(s: VMStatus) {
        if (
            this.isReady &&
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
        public readonly env: Environment,
        private readonly handler: IT4Handler
    ) {
        this.reset()
    }

    get status() {
        return this.stopped ? VMStatus.Stopped :
            this._currentCommand === undefined ? VMStatus.Paused : this._currentCommand.status
    }

    public reset() {
        this._commandIndex = undefined
        this._currentCommand = undefined
        this.stopped = false
    }

    start() {
        this._commandIndex = 0
    }

    cancel() {
        this.stopped = true
    }

    // run-to-completion semantics
    step() {
        if (this._commandIndex === undefined)
            return;
        if (this._currentCommand === undefined)
            this._currentCommand = new IT4CommandRunner(this.env, this.handler.commands[this._commandIndex])
        this._currentCommand.step()
        while (this._currentCommand.status === VMStatus.Completed &&
               this._commandIndex < this.handler.commands.length - 1) {
                this._commandIndex++
                this._currentCommand = new IT4CommandRunner(this.env, this.handler.commands[this._commandIndex])
                this._currentCommand.step()
        }
    }
}

export class IT4ProgramRunner extends JDServiceClient  {
    private _handlers: IT4HandlerRunner[]
    private _env: VMRoleManagerEnvironment
    private _waitQueue: IT4HandlerRunner[] = []

    constructor(program: IT4Program, rolemanager: JDService) {
        super(rolemanager)
        this._env = new VMRoleManagerEnvironment(rolemanager, () => {
            this.run()
        })
        this._handlers = program.handlers.map(h => new IT4HandlerRunner(this._env, h))
        this._waitQueue = this._handlers.slice(0)
    }

    run() {
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
        } else {
            // program is done, unmount
        }
    }
}