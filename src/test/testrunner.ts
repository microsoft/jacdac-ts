import {
    Commands,
    testCommandFunctions,
} from "../../jacdac-spec/spectool/jdtestfuns"
import { CHANGE } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDService } from "../jdom/service"
import { JDRegister } from "../jdom/register"
import { JDServiceClient } from "../jdom/serviceclient"
import { JSONPath } from "jsonpath-plus"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"

export enum JDCommandStatus {
    NotReady,
    Active,
    RequiresUserInput,
    Passed,
    Failed,
}

export enum JDTestStatus {
    NotReady,
    ReadyToRun,
    Active,
    Passed,
    Failed,
}

function commandStatusToTestStatus(status: JDCommandStatus) {
    switch (status) {
        case JDCommandStatus.Active:
            return JDTestStatus.Active
        case JDCommandStatus.Passed:
            return JDTestStatus.Passed
        case JDCommandStatus.Failed:
            return JDTestStatus.Failed
        case JDCommandStatus.NotReady:
            return JDTestStatus.NotReady
        case JDCommandStatus.RequiresUserInput:
            return JDTestStatus.Active
    }
}

function cmdToTestFunction(cmd: jdtest.CommandSpec) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return testCommandFunctions.find(t => t.id == id)
}

function unparse(e: jsep.Expression): string {
    switch (e.type) {
        case "CallExpression": {
            const caller = e as jsep.CallExpression
            return `${unparse(caller.callee)}(${caller.arguments
                .map(unparse)
                .join(", ")})`
        }
        case "BinaryExpression":
        case "LogicalExpression": {
            const be = e as any
            return `(${unparse(be.left)} ${be.operator} ${unparse(be.right)})`
        }
        case "UnaryExpression": {
            const ue = e as jsep.UnaryExpression
            return `${ue.operator}${unparse(ue.argument)}`
        }
        case "Identifier": {
            return (e as jsep.Identifier).name
        }
        case "Literal": {
            return (e as jsep.Literal).raw
        }
        default:
            return "TODO"
    }
}

type SMap<T> = { [v: string]: T }
type StartMap = { e: jsep.Expression; v: any }[]

class JDExprEvaluator {
    private exprStack: any[] = []

    constructor(private env: SMap<any>, private start: StartMap) {}

    private tos() {
        return this.exprStack[this.exprStack.length - 1]
    }

    public eval(e: jsep.Expression) {
        this.exprStack = []
        this.visitExpression(e)
        return this.exprStack.pop()
    }

    private visitExpression(e: jsep.Expression) {
        switch (e.type) {
            case "CallExpression": {
                const caller = <jsep.CallExpression>e
                const callee = <jsep.Identifier>caller.callee
                switch (callee.name) {
                    case "start":
                        this.exprStack.push(
                            this.start.find(r => r.e === caller).v
                        )
                        return
                    default: // ERROR
                }
                break
            }

            case "BinaryExpression": {
                const be = <jsep.BinaryExpression>e
                this.visitExpression(be.left)
                this.visitExpression(be.right)
                const right = this.exprStack.pop()
                const left = this.exprStack.pop()
                switch (be.operator) {
                    case "+":
                        this.exprStack.push(left + right)
                        return
                    case "-":
                        this.exprStack.push(left - right)
                        return
                    case "/":
                        this.exprStack.push(left / right)
                        return
                    case "*":
                        this.exprStack.push(left * right)
                        return
                    case "%":
                        this.exprStack.push(left % right)
                        return
                    case ">>":
                        this.exprStack.push(left >> right)
                        return
                    case ">>>":
                        this.exprStack.push(left >>> right)
                        return
                    case "<<":
                        this.exprStack.push(left << right)
                        return
                    case "|":
                        this.exprStack.push(left | right)
                        return
                    case "&":
                        this.exprStack.push(left & right)
                        return
                    case "^":
                        this.exprStack.push(left ^ right)
                        return
                    case "==":
                        this.exprStack.push(left == right)
                        return
                    case "!=":
                        this.exprStack.push(left != right)
                        return
                    case "===":
                        this.exprStack.push(left === right)
                        return
                    case "!==":
                        this.exprStack.push(left !== right)
                        return

                    case "<":
                        this.exprStack.push(left < right)
                        return
                    case ">":
                        this.exprStack.push(left > right)
                        return
                    case "<=":
                        this.exprStack.push(left <= right)
                        return
                    case ">=":
                        this.exprStack.push(left >= right)
                        return
                }
                break
            }

            case "UnaryExpression":
            case "LogicalExpression": {
                const le = <jsep.LogicalExpression>e
                this.visitExpression(le.left)
                switch (le.operator) {
                    case "||":
                        if (this.tos()) return
                        else this.visitExpression(le.right)
                        break
                    case "&&":
                        if (!this.tos()) return
                        else this.visitExpression(le.right)
                        break
                    default:
                }
                break
            }

            case "Identifier": {
                const id = <jsep.Identifier>e
                this.exprStack.push(this.env[id.name])
                break
            }
            case "Literal": {
                const lit = <jsep.Literal>e
                this.exprStack.push(lit.value)
                break
            }
            default:
        }
    }
}

class JDCommandEvaluator {
    private _prompt = ""
    private _progress = 0.0
    private _status = JDCommandStatus.Active
    private _startExpressions: StartMap = []

    constructor(
        private readonly env: SMap<any>,
        private readonly command: jdtest.CommandSpec
    ) {}

    public get prompt() {
        return this._prompt
    }
    public get status() {
        return this._status
    }
    public get progress() {
        return this._progress
    }

    public start() {
        this._startExpressions = []
        const testFun = cmdToTestFunction(this.command)
        const args = this.command.call.arguments
        let startExprs: jsep.Expression[] = []
        switch (testFun.id as Commands) {
            case "check": {
                startExprs = (<jsep.CallExpression[]>JSONPath({
                    path: "$..*[?(@.type=='CallExpression')]",
                    json: args,
                }))
                    .filter(ce => (<jsep.Identifier>ce.callee).name === "start")
                    .map(ce => ce.arguments[0])
                break
            }
            case "changes":
            case "increases":
            case "decreases": {
                startExprs.push(args[0])
                break
            }
            case "increasesBy":
            case "decreasesBy": {
                startExprs.push(args[0])
                startExprs.push(args[1])
                break
            }
            case "rangesFromUpTo":
            case "rangesFromDownTo": {
                startExprs.push(args[1])
                startExprs.push(args[2])
                break
            }
        }
        // evaluate the start expressions and store the results
        startExprs.forEach(child => {
            if (this._startExpressions.findIndex(r => r.e === child) < 0) {
                const exprEval = new JDExprEvaluator(this.env, [])
                this._startExpressions.push({
                    e: child,
                    v: exprEval.eval(child),
                })
            }
        })
        this.createPrompt()
    }

    private createPrompt() {
        const testFun = cmdToTestFunction(this.command)
        const replace = this.command.call.arguments.map((a, i) => [
            `{${i + 1}}`,
            unparse(a),
        ])
        this._prompt =
            testFun.id === "ask" || testFun.id === "say"
                ? this.command.prompt.slice(0)
                : testFun.prompt.slice(0)
        replace.forEach(p => (this._prompt = this._prompt.replace(p[0], p[1])))
    }

    public evaluate() {
        const testFun = cmdToTestFunction(this.command)
        this._status = JDCommandStatus.Active
        this._progress = undefined
        switch (testFun.id as Commands) {
            case "say":
            case "ask": {
                this._status =
                    testFun.id === "say"
                        ? JDCommandStatus.Passed
                        : JDCommandStatus.RequiresUserInput
                break
            }
            case "check": {
                const expr = new JDExprEvaluator(
                    this.env,
                    this._startExpressions
                )
                const ev = expr.eval(this.command.call.arguments[0])
                this._status = ev
                    ? JDCommandStatus.Passed
                    : JDCommandStatus.Active
                break
            }
            case "changes":
            case "increases":
            case "decreases": {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const regValue = this.env[unparse(reg)]
                const [status, progress] =
                    (testFun.id === "changes" && regValue !== regSaved.v) ||
                    (testFun.id === "increases" && regValue > regSaved.v) ||
                    (testFun.id === "decreases" && regValue < regSaved.v)
                        ? [JDCommandStatus.Passed, 1.0]
                        : [JDCommandStatus.Active, 0.0]
                this._status = status
                this._progress = progress
                regSaved.v = regValue
                break
            }
            case "increasesBy":
            case "decreasesBy": {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const amt = this.command.call.arguments[1]
                const amtSaved = this._startExpressions.find(r => r.e === amt)
                const regValue = this.env[unparse(reg)]
                if (testFun.id === "increasesBy") {
                    if (regValue === regSaved.v + amtSaved.v) {
                        this._status = JDCommandStatus.Passed
                        this._progress = 1.0
                    } else if (
                        regValue >= regSaved.v &&
                        regValue < regSaved.v.v + amtSaved.v
                    ) {
                        this._status = JDCommandStatus.Active
                        this._progress = (regValue - regSaved.v) / amtSaved.v
                    } else {
                        this._status = JDCommandStatus.Active
                    }
                } else {
                    if (regValue === regSaved.v - amtSaved.v) {
                        this._status = JDCommandStatus.Passed
                        this._progress = 1.0
                    } else if (
                        regValue <= regSaved.v &&
                        regValue > regSaved.v.v - amtSaved.v
                    ) {
                        this._status = JDCommandStatus.Active
                        this._progress = (regSaved.v - regValue) / amtSaved.v
                    } else {
                        this._status = JDCommandStatus.Active
                    }
                }
                break
            }
            case "rangesFromUpTo":
            case "rangesFromDownTo": {
                break
            }
        }
    }
}

export interface JDCommandOutput {
    message: string
    progress: number
}

export class JDCommandRunner extends JDEventSource {
    private _status = JDCommandStatus.NotReady
    private _output: JDCommandOutput = { message: "", progress: 0.0 }
    private readonly _timeOut = 5000 // timeout
    private _timeLeft = 5000
    private _commmandEvaluator: JDCommandEvaluator = null

    constructor(
        private readonly testRunner: JDTestRunner,
        private readonly env: SMap<any>,
        private readonly command: jdtest.CommandSpec
    ) {
        super()
    }

    get status() {
        return this._status
    }

    set status(s: JDCommandStatus) {
        if (s != this._status) {
            this._status = s
            this.emit(CHANGE)
        }
    }

    get indeterminate(): boolean {
        return (
            this.status !== JDCommandStatus.Failed &&
            this.status !== JDCommandStatus.Passed
        )
    }

    get output() {
        return this._output
    }

    set output(value: JDCommandOutput) {
        if (
            !this._output ||
            this._output.message !== value.message ||
            this._output.progress !== value.progress
        ) {
            this._output = value
            this.emit(CHANGE)
        }
    }

    reset() {
        this.output = { message: "", progress: 0.0 }
        this.status = JDCommandStatus.NotReady
        this._commmandEvaluator = null
    }

    start() {
        this.status = JDCommandStatus.Active
        this._commmandEvaluator = new JDCommandEvaluator(this.env, this.command)
        this._commmandEvaluator.start()
        this.envChange(false)
        this.envChange(true)
    }

    envChange(finish = true) {
        if (this._commmandEvaluator) {
            this._commmandEvaluator.evaluate()
            const newOutput: JDCommandOutput = {
                message: this._commmandEvaluator.prompt,
                progress: this._commmandEvaluator.progress,
            }
            this.output = newOutput
            if (finish) this.finish(this._commmandEvaluator.status)
        }
    }

    cancel() {
        this.finish(JDCommandStatus.Failed)
    }

    finish(s: JDCommandStatus) {
        if (
            (s === JDCommandStatus.Failed || s === JDCommandStatus.Passed) &&
            (this.status === JDCommandStatus.Active ||
                this.status === JDCommandStatus.RequiresUserInput)
        ) {
            this.status = s
            this.testRunner.finishCommand()
        }
    }
}

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _description: string
    private _commandIndex: number
    public readonly commands: JDCommandRunner[]

    constructor(
        private readonly serviceTestRunner: JDServiceTestRunner,
        private readonly env: SMap<any>,
        private readonly testSpec: jdtest.TestSpec
    ) {
        super()
        this.commands = testSpec.commands.map(
            c => new JDCommandRunner(this, this.env, c)
        )
        this._description = testSpec.description
    }

    reset() {
        this.status = JDTestStatus.NotReady
        this.commands.forEach(t => t.reset())
    }

    ready() {
        if (this.status === JDTestStatus.NotReady)
           this.status = JDTestStatus.ReadyToRun
    }

    public start() {
        if (this.status === JDTestStatus.ReadyToRun) {
            this.status = JDTestStatus.Active
            this.commandIndex = 0
        }
    }

    cancel() {
        this.finish(JDTestStatus.Failed)
    }

    get status() {
        return this._status
    }

    set status(s: JDTestStatus) {
        if (s != this._status) {
            this._status = s
            this.emit(CHANGE)
        }
    }

    get indeterminate(): boolean {
        return (
            this.status !== JDTestStatus.Failed &&
            this.status !== JDTestStatus.Passed
        )
    }

    get description() {
        return this._description
    }

    finish(s: JDTestStatus) {
        if (this.status === JDTestStatus.Active) {
            this.status = s
            this.serviceTestRunner.finishTest()
        }
    }

    private get commandIndex() {
        return this._commandIndex
    }

    private set commandIndex(index: number) {
        if (this._commandIndex !== index) {
            this._commandIndex = index
            this.currentCommand?.start()
            this.emit(CHANGE)
        }
    }

    public envChange() {
        this.currentCommand?.envChange()
    }

    public finishCommand() {
        if (this.commandIndex === this.commands.length - 1)
            this.finish(commandStatusToTestStatus(this.currentCommand.status))
        // (this.commandIndex < this.commands.length)
        else this.commandIndex++
    }

    get currentCommand() {
        return this.commands[this._commandIndex]
    }
}

export class JDServiceTestRunner extends JDServiceClient {
    private _testIndex = -1
    private registers: SMap<JDRegister> = {}
    private environment: SMap<number> = {}
    public readonly tests: JDTestRunner[]

    constructor(
        public readonly testSpec: jdtest.ServiceTestSpec,
        service: JDService
    ) {
        super(service)
        this.tests = this.testSpec.tests.map(
            t => new JDTestRunner(this, this.environment, t)
        )
        const serviceSpec = serviceSpecificationFromClassIdentifier(
            service.serviceClass
        )
        this.testSpec.tests.forEach(t => {
            t.registers.forEach(regName => {
                if (!this.registers[regName]) {
                    const pkt = serviceSpec.packets.find(
                        pkt => pkt.name === regName
                    )
                    const register = service.register(pkt.identifier)
                    this.registers[regName] = register
                    this.environment[regName] = 0
                    register.subscribe(CHANGE, () => {
                        this.environment[regName] = register.intValue
                        this.currentTest?.envChange()
                    })
                }
            })
        })
        this.start()
    }

    private get testIndex() {
        return this._testIndex
    }

    private set testIndex(index: number) {
        if (this._testIndex !== index) {
            this._testIndex = index
            this.emit(CHANGE)

            this.currentTest?.ready()
        }
    }

    public start() {
        this.tests.forEach(t => t.reset())
        this.testIndex = 0
    }

    public finishTest() {
        if (this.testIndex < this.tests.length) {
            this.testIndex++
        }
    }

    get currentTest() {
        return this.tests[this._testIndex]
    }
}
