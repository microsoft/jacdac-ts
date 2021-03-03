import { testCommandFunctions } from "../../jacdac-spec/spectool/jdtestfuns"
import { CHANGE } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { JSONPath } from "jsonpath-plus"

export enum JDCommandStatus {
    NotStarted,
    Suceeded,
    Failed,
    InProgress,
    TimedOut,
}

export enum JDTestStatus {
    NotReady,
    Active,
    Passed,
    Failed,
}

export function cmdToTestFunction(cmd: jdtest.CommandSpec) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return testCommandFunctions.find(t => t.id == id)
}

export function cmdToPrompt(cmd: jdtest.CommandSpec) {
    return cmd.prompt ? cmd.prompt : cmdToTestFunction(cmd).prompt
}

type SMap<T> = { [v: string]: T }

export class JDExprEvaluator {
    private exprStack: any[] = []

    constructor(private env: SMap<any>) {}

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

export class JDCommandClosure {
    private currentCmdStatus = JDCommandStatus.NotStarted
    private commandTimeOut = 10000

    constructor(private cmd: jdtest.CommandSpec) {

    }

    semantics() {
        switch(cmdToTestFunction(this.cmd).id) {
            case 'say':
                break
            case 'ask':
            case 'changes':
            case 'check':
            case 'increases':
            case 'decreases':
            case 'decreasesBy':
            case 'increasesBy':
            case 'rangeFromUpTo':
            case 'rangeFromDownTo':
            case 'reset':
                break
            default:
        }
    }
}

// TODO: subscribe to events on the bus to get updates about the device' registers
// TODO: allow subscribers to test event JDEventSource

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _output: string

    private startExpressions: jsep.CallExpression[] = []

    constructor(
        private readonly testRunner: JDServiceTestRunner,
        public readonly specification: jdtest.TestSpec
    ) {
        super()
        // collect up the start(expr) calls
        this.specification.commands.forEach(cmd => {
            const starts = (<jsep.CallExpression[]>JSONPath({
                path: "$..*[?(@.type=='CallExpression')]",
                json: cmd.call.arguments,
            })).filter((ce: jsep.CallExpression) => (<jsep.Identifier>ce.callee).name === "start")
            starts.forEach(s => {
                if (this.startExpressions.indexOf(s) < 0)
                    this.startExpressions.push(s)
            })
        })
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
            this.status !== JDTestStatus.NotReady &&
            this.status !== JDTestStatus.Active
        )
    }

    get output() {
        return this._output
    }

    set output(value: string) {
        if (this._output !== value) {
            this._output = value
            this.emit(CHANGE)
        }
    }

    reset() {
        this.output = undefined
        this.status = JDTestStatus.NotReady
    }

    start() {
        this.status = JDTestStatus.Active
        // evaluate the start conditions and create environment map
    }

    cancel() {
        // TODO
        if (this.status === JDTestStatus.Active)
            this.status = JDTestStatus.Failed
    }

    finish(s: JDTestStatus) {
        this.status = s
        this.testRunner.finishTest()
    }
}

export class JDServiceTestRunner extends JDServiceClient {
    private _testIndex = -1
    public readonly tests: JDTestRunner[]

    constructor(
        public readonly specification: jdtest.ServiceTestSpec,
        service: JDService
    ) {
        super(service)
        this.tests = this.specification.tests.map(
            t => new JDTestRunner(this, t)
        )
        this.start()
    }

    private get testIndex() {
        return this._testIndex
    }

    private set testIndex(index: number) {
        if (this._testIndex !== index) {
            this._testIndex = index
            this.emit(CHANGE)

            this.currentTest?.start()
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
