import { Commands, testCommandFunctions } from "../../jacdac-spec/spectool/jdtestfuns"
import { CHANGE } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDService } from "../jdom/service"
import { JDRegister } from "../jdom/register"
import { JDServiceClient } from "../jdom/serviceclient"
import { JSONPath } from "jsonpath-plus"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"
import { JDServiceMemberNode } from "../jdom/servicemembernode"

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

function unparse(e: jsep.Expression): string {
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
            return "TODO"
    }
}

type SMap<T> = { [v: string]: T }
type StartMap = { e: jsep.Expression, v: any}[]

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
                        this.exprStack.push(this.start.find(r => r.e === caller).v)
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
    private _progress =  0.0
    private _status = JDCommandStatus.Active
    private _startExpressions: StartMap = []

    constructor(
        private readonly env: SMap<any>, 
        private readonly command: jdtest.CommandSpec) 
    {
    }

    public get prompt() { return this._prompt }
    public get status() { return this._status }
    public get progress() { return this._progress }

    public start () {
        const testFun = cmdToTestFunction(this.command)
        let startExprs: jsep.Expression[] = []
        switch (testFun.id) {
            case 'check': {
                startExprs = (<jsep.CallExpression[]>JSONPath({
                    path: "$..*[?(@.type=='CallExpression')]",
                    json: this.command.call.arguments,
                }))
                .filter(ce => (<jsep.Identifier>ce.callee).name === "start")
                .map(ce => ce.arguments[0])
                break
            }
            case 'change': 
            case 'increase':
            case 'decrease':{
                const regExpr = this.command.call.arguments[0]
                startExprs.push(regExpr)
                break
            }
            case 'increaseBy':
            case 'decreaseBy': {
                const byExpr = this.command.call.arguments[1]
                startExprs.push(byExpr)
                const regExpr = this.command.call.arguments[0]
                startExprs.push(regExpr)
                break
            }
            case 'rangeFromUpTo':
            case 'rangeFromDownTo': {
                const rangeBegin = this.command.call.arguments[1]
                const rangeEnd = this.command.call.arguments[2]
                startExprs.push(rangeBegin)
                startExprs.push(rangeEnd)
                break
            }
        }
        // evaluate the start expressions and store the results
        startExprs.forEach(child => {
            if (this._startExpressions.findIndex(r => r.e === child) < 0) {
                const exprEval = new JDExprEvaluator(this.env, [])
                this._startExpressions.push({e: child, v: exprEval.eval(child)})
            }
        })
    }

    public evaluate() {
        const testFun = cmdToTestFunction(this.command)
        this._prompt = this.command.prompt 
        if (this.command.call.arguments.length > 0) {
            const replace = this.command.call.arguments.map((a,i) => [`${i+1}`,unparse(a)])
            this._prompt = testFun.prompt.slice(0)
            replace.forEach(p => this._prompt.replace(p[0],p[1]))
        }
        switch(testFun.id) {
            case 'say':
            case 'ask': {
                this._prompt = this.command.prompt
                this._status = testFun.id === 'say' ? JDCommandStatus.Passed : JDCommandStatus.RequiresUserInput;
                break
            }
            case 'check': {
                const expr = new JDExprEvaluator(this.env, this._startExpressions)
                const ev = expr.eval(this.command.call.arguments[0])
                this._status = ev ? JDCommandStatus.Passed : JDCommandStatus.Failed
                this._progress = 1.00
                break
            }
            case 'changes': 
            case 'increases':
            case 'decreases': {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const regValue = this.env[unparse(reg)] 
                const [status, progress] =  
                        (testFun.id === 'changes' && regValue !== regSaved.v ||
                        testFun.id === 'increases' && regValue > regSaved.v ||
                        testFun.id === 'decreases' && regValue < regSaved.v
                        ) ?  [JDCommandStatus.Passed, 1.0]
                    : [JDCommandStatus.Failed, 0.0]
                this._status = status
                this._progress = progress
                regSaved.v = regValue
                break
            }
            case 'increasesBy':
            case 'decreasesBy': {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const amt = this.command.call.arguments[1]
                const amtSaved = this._startExpressions.find(r => r.e === amt)
                const regValue = this.env[unparse(reg)] 
                const [status, progress] =  
                        (testFun.id === 'increasesBy' && regValue > regSaved ||
                         testFun.id === 'decreasesBy' && regValue < regSaved
                        ) ?  [JDCommandStatus.Passed, 1.0]
                    : [JDCommandStatus.Failed, 0.0]
                this._status = status
                this._progress = progress
                regSaved.v = regValue
                break
            }  
            case 'rangesFromUpTo':
            case 'rangesFromDownTo':
            {
                break
            }     
        }
    }
}

export interface JDCommandOutput {
    prompt: string
    progress: number
}

export class JDCommandRunner extends JDEventSource {
    private _status = JDCommandStatus.NotReady
    private _output: JDCommandOutput = undefined
    private _progress = 0               // progress towards test success
    private readonly _timeOut = 5000    // timeout
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
        if (this._output.prompt !== value.prompt || this._output.progress !== value.progress) {
            this._output = value
            this.emit(CHANGE)
        }
    }

    reset() {
        this.output = undefined
        this.status = JDCommandStatus.NotReady
        this._commmandEvaluator = null;
    }

    start() {
        this.status = JDCommandStatus.Active
        this._commmandEvaluator = new JDCommandEvaluator(this.env, this.command)
        this._commmandEvaluator.start()
    }

    envChange() {
        if (this._commmandEvaluator) {
            this._commmandEvaluator.evaluate()
            const newOutput: JDCommandOutput = {
                prompt: this._commmandEvaluator.prompt,
                progress: this._commmandEvaluator.progress,
            }
            this.status = this._commmandEvaluator.status
            this.output = newOutput
        }
    }

    cancel() {
        this.finish(JDCommandStatus.Failed)
    }

    finish(s: JDCommandStatus) {
        if (this.status === JDCommandStatus.Active || 
            this.status === JDCommandStatus.RequiresUserInput) {
            this._commmandEvaluator = null
            this.status = s
            this.testRunner.finishTest()
        }
    }
}

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _output: string
    private _commandIndex: number
    public readonly commands: JDCommandRunner[]

    constructor(
        private readonly testRunner: JDServiceTestRunner,
        private readonly env: SMap<any>, 
        public readonly specification: jdtest.TestSpec
    ) {
        super()
        this.commands = this.specification.commands.map(
            c => new JDCommandRunner(this, this.env, c)
        )
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

    public envChange() {
        this.currentCommand?.envChange();
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
            t => new JDTestRunner(this, this.environment, t)
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
                        this.currentTest?.envChange()
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
