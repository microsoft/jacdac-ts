import { Commands, testCommandFunctions } from "../../jacdac-spec/spectool/jdtestfuns"
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

function unparse(e: jsep.Expression) {
    switch (e.type) {
        case "CallExpression": {
            const caller = e as jsep.CallExpression
            return `${unparse(caller.callee)}(${caller.arguments.map(unparse).join(", ")})`
        }
        case "BinaryExpression": 
        case "LogicalExpression":     
        {
            const be = e as any
            return `(${unparse(be.left)} ${be.operator} ${unparse(be.right)})`
        }
        case "UnaryExpression":
        {
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
    }
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

class JDCOmmandEvaluator {
    private _prompt = ""
    private _progress =  0.0
    private _status = JDCommandStatus.Active

    constructor(
        private readonly env: SMap<any>, 
        private readonly command: jdtest.CommandSpec) 
    {
    }

    public evaluate() {
        const testFun = cmdToTestFunction(this.command)
        this._prompt = testFun.prompt // TODO: pretty print expr and substitute
        switch(testFun.id) {
            case 'say':
            case 'ask': {
                this._prompt = this.command.prompt
                this._status = testFun.id === 'say' ? JDCommandStatus.Passed : JDCommandStatus.RequiresUserInput;
                break
            }
            case 'check': {
                let expr = new JDExprEvaluator(this.env)
                let ev = expr.eval(this.command.call.arguments[0])
                this._status = ev ? JDCommandStatus.Passed : JDCommandStatus.Failed
            }
            case 'changes': {

            }
            case 'increases':
            case 'decreases':
            case 'increasesBy':
            case 'decreasesBy':        
        }
    }
}

export class JDCommandRunner extends JDEventSource {
    private _status = JDCommandStatus.NotReady
    private _output = ""
    private _progress = 0               // progress towards test success
    private readonly _timeOut = 5000    // timeout
    private _timeLeft = 5000

    constructor(
        private readonly testRunner: JDTestRunner,
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
            this.status === JDCommandStatus.NotReady ||
            this.status === JDCommandStatus.Active
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
        this.status = JDCommandStatus.NotReady
    }

    start() {
        this.status = JDCommandStatus.Active
        // evaluate the start conditions and create environment map
    }

    cancel() {
        // TODO
        if (this.status === JDCommandStatus.Active)
            this.status = JDCommandStatus.Failed
    }

    finish(s: JDCommandStatus) {
        this.status = s
        // .testRunner.finishTest()
    }
}


export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _output: string
    private _commandIndex: number
    public readonly commands: JDCommandRunner[]

    private startExpressions: jsep.CallExpression[] = []

    constructor(
        private readonly testRunner: JDServiceTestRunner,
        public readonly specification: jdtest.TestSpec
    ) {
        super()
        this.commands = this.specification.commands.map(
            c => new JDCommandRunner(this, c)
        )
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
            this.status === JDTestStatus.NotReady ||
            this.status === JDTestStatus.Active
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

    cancel() {
        // TODO
        if (this.status === JDTestStatus.Active)
            this.status = JDTestStatus.Failed
    }

    finish(s: JDTestStatus) {
        this.status = s
        this.testRunner.finishTest()
    }

    private get commandIndex() {
        return this._commandIndex
    }

    private set commandIndex(index: number) {
        if (this._commandIndex !== index) {
            this._commandIndex = index
            this.emit(CHANGE)

            this.currentCommand?.start()
        }
    }

    public start() {
        this.commands.forEach(t => t.reset())
        this.commandIndex = 0
    }

    public finishTest() {
        if (this.commandIndex < this.commands.length) {
            this.commandIndex++
        }
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
        public readonly specification: jdtest.ServiceTestSpec,
        service: JDService
    ) {
        super(service)
        this.tests = this.specification.tests.map(
            t => new JDTestRunner(this, t)
        )
        const serviceSpec = serviceSpecificationFromClassIdentifier(service.serviceClass)
        this.specification.tests.forEach(t => {
            t.registers.forEach(regName => {
                if (!this.registers[regName]) {
                    const pkt = serviceSpec.packets.find(pkt => pkt.identifierName === regName)
                    const register = service.register(pkt.identifier)
                    this.registers[regName] = register
                    this.environment[regName] = 0;
                    register.subscribe(CHANGE, () => {
                        this.environment[regName] = register.intValue
                        if (this.currentTest) {
                            // TODO: notify the active test of the change
                            // this.currentTest.
                        }
                    });
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
