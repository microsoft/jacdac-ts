import {
    Commands,
    testCommandFunctions,
} from "../../jacdac-spec/spectool/jdtestfuns"
import { exprVisitor } from "../../jacdac-spec/spectool/jdutils"

import { CHANGE, EVENT } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDService } from "../jdom/service"
import { JDRegister } from "../jdom/register"
import { JDEvent } from "../jdom/event"
import { JDServiceClient } from "../jdom/serviceclient"
import { isEvent, isRegister, serviceSpecificationFromClassIdentifier } from "../jdom/spec"
import { roundWithPrecision } from "../jdom/utils"

export enum JDTestCommandStatus {
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

function commandStatusToTestStatus(status: JDTestCommandStatus) {
    switch (status) {
        case JDTestCommandStatus.Active:
            return JDTestStatus.Active
        case JDTestCommandStatus.Passed:
            return JDTestStatus.Passed
        case JDTestCommandStatus.Failed:
            return JDTestStatus.Failed
        case JDTestCommandStatus.NotReady:
            return JDTestStatus.NotReady
        case JDTestCommandStatus.RequiresUserInput:
            return JDTestStatus.Active
    }
}

function cmdToTestFunction(cmd: jdtest.TestCommandSpec) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return testCommandFunctions.find(t => t.id == id)
}

function unparse(e: jsep.Expression): string {
    switch (e.type) {
        case "ArrayExpression": {
            const ae = e as jsep.ArrayExpression
            return `[${ae.elements
                .map(unparse)
                .join(", ")}]`
        }
        case "CallExpression": {
            const caller = e as jsep.CallExpression
            return `${unparse(caller.callee)}(${caller.arguments
                .map(unparse)
                .join(", ")})`
        }
        case "MemberExpression": {
            const root = e as jsep.MemberExpression
            return root.computed ? `${unparse(root.object)}[${unparse(root.property)}]`
                : `${unparse(root.object)}.${unparse(root.property)}`
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StartMap = { e: jsep.Expression; v: any }[]

type GetValue = (root: string, fld: string) => any

class JDExprEvaluator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private exprStack: any[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private env: GetValue, private start: StartMap) { }

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
            case "ArrayExpression": {
                // nothing to do here yet (only used for event function)
                break
            }

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
            case "MemberExpression": {
                // member expressions are of form [register|event].field
                const root = e as jsep.MemberExpression
                const lhs = root.object as jsep.Identifier
                const rhs = root.property as jsep.Identifier
                const val = this.env(lhs.name, rhs.name)
                // console.log(`${lhs.name}.${rhs.name} = ${val}`)
                this.exprStack.push(val)
                break
            }
            case "Identifier": {
                const id = <jsep.Identifier>e
                this.exprStack.push(this.env(id.name, ""))
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
    private _progress = ""
    private _status = JDTestCommandStatus.Active
    private _startExpressions: StartMap = []
    private _rangeComplete: number = undefined
    private _eventsComplete: string[] = undefined

    constructor(
        private readonly testRunner: JDTestRunner,
        private readonly command: jdtest.TestCommandSpec
    ) {

    }

    public get prompt() {
        return this._prompt
    }
    public get status() {
        return this._status
    }
    public get progress() {
        return this._progress
    }

    private get env() {
        return (root: string, fld: string = "") => {
            return this.testRunner.serviceTestRunner.lookup(root, fld)
        }
    }

    // TODO: define an interface between test runner and command evaluator
    // TODO: so this all can be done modularly
    public start() {
        this._startExpressions = []
        const testFun = cmdToTestFunction(this.command)
        const args = this.command.call.arguments
        let startExprs: jsep.Expression[] = []
        switch (testFun.id as Commands) {
            case "check": 
            case "awaitEvent":
            case "nextEvent":
            {
                exprVisitor(null, args, (p,ce:jsep.CallExpression) => {
                    if (ce.type === 'CallExpression' && (<jsep.Identifier>ce.callee).name === "start")
                        startExprs.push(ce.arguments[0])
                })
                break
            }
            case "changes":
            case "increases":
            case "decreases": {
                startExprs.push(args[0])
                break
            }
            case "increasesBy":
            case "decreasesBy":
            case "stepsUpTo":
            case "stepsDownTo": {
                startExprs.push(args[0])
                startExprs.push(args[1])
                break
            }
            case "assign": {
                startExprs.push(args[1])
                break
            }
            case "events": {
                const eventList = this.command.call.arguments[0] as jsep.ArrayExpression
                this._eventsComplete = (eventList.elements as jsep.Identifier[]).map(id => id.name)
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
        const replaceId = this.command.call.arguments.map((a, i) => {
            return [`{${i + 1}}`, unparse(a)]
        })
        const replaceVal = this.command.call.arguments.map((a, i) => {
            const aStart = this._startExpressions.find(r => r.e === a)
            return [`{${i + 1}:val}`, aStart && aStart.v ? roundWithPrecision(aStart.v, 3).toString() : "NA"]
        })
        this._prompt =
            testFun.id === "ask" || testFun.id === "say"
                ? this.command.prompt.slice(0)
                : testFun.prompt.slice(0)
        replaceId.forEach(p => (this._prompt = this._prompt.replace(p[0], p[1])))
        replaceVal.forEach(p => (this._prompt = this._prompt.replace(p[0], p[1])))
    }

    public setEvent(ev: string) {

    }
    
    private checkExpression(e: jsep.Expression) {
        const expr = new JDExprEvaluator(
            this.env,
            this._startExpressions
        )
        return expr.eval(e)
            ? JDTestCommandStatus.Passed
            : JDTestCommandStatus.Active
    }

    public evaluate() {
        const testFun = cmdToTestFunction(this.command)
        this._status = JDTestCommandStatus.Active
        this._progress = ""
        switch (testFun.id as Commands) {
            case "ask": {
                this._status = JDTestCommandStatus.RequiresUserInput
                break
            }
            case "check": {
                this._status = this.checkExpression(this.command.call.arguments[0])
                break
            }
            case "changes":
            case "increases":
            case "decreases": {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const regValue = this.env(unparse(reg))
                const status =
                    (testFun.id === "changes" && regValue !== regSaved.v) ||
                        (testFun.id === "increases" && regValue > regSaved.v) ||
                        (testFun.id === "decreases" && regValue < regSaved.v)
                        ? JDTestCommandStatus.Passed
                        : JDTestCommandStatus.Active
                this._status = status
                regSaved.v = regValue
                break
            }
            case "increasesBy":
            case "decreasesBy": {
                const reg = this.command.call.arguments[0]
                const regSaved = this._startExpressions.find(r => r.e === reg)
                const amt = this.command.call.arguments[1]
                const amtSaved = this._startExpressions.find(r => r.e === amt)
                const regValue = this.env(unparse(reg))
                if (testFun.id === "increasesBy") {
                    if (regValue >= regSaved.v + amtSaved.v) {
                        this._status = JDTestCommandStatus.Passed
                    } else if (
                        regValue >= regSaved.v &&
                        regValue < regSaved.v + amtSaved.v
                    ) {
                        this._status = JDTestCommandStatus.Active
                        this._progress = `current: ${pretify(regValue)}, goal: ${pretify(regSaved.v + amtSaved.v)}`
                    } else {
                        this._status = JDTestCommandStatus.Active
                    }
                } else {
                    if (regValue <= regSaved.v - amtSaved.v) {
                        this._status = JDTestCommandStatus.Passed
                        this._progress = "completed"
                    } else if (
                        regValue <= regSaved.v &&
                        regValue > regSaved.v - amtSaved.v
                    ) {
                        this._status = JDTestCommandStatus.Active
                        this._progress = `current: ${pretify(regValue)} goal: ${pretify(regSaved.v - amtSaved.v)}`
                    } else {
                        this._status = JDTestCommandStatus.Active
                    }
                }
                break
            }
            case "stepsUpTo":
            case "stepsDownTo": {
                this._status = JDTestCommandStatus.Active
                const reg = this.command.call.arguments[0]
                const regValue = this.env(unparse(reg))
                const beginSaved = this._startExpressions.find(r => r.e === reg)
                const end = this.command.call.arguments[1]
                const endSaved = this._startExpressions.find(r => r.e === end)
                if (this._rangeComplete === undefined) {
                    this._rangeComplete = regValue
                } else {
                    if (regValue === this._rangeComplete + (testFun.id == 'stepsUpTo' ? 1 : -1))
                        this._rangeComplete = regValue
                    if (this._rangeComplete === endSaved.v) {
                        this._status = JDTestCommandStatus.Passed
                    }
                }
                if (this._rangeComplete != undefined) {
                    this._progress =
                        testFun.id == 'stepsUpTo'
                            ? `from ${pretify(beginSaved.v)} up to ${pretify(this._rangeComplete)}`
                            : `from ${pretify(beginSaved.v)} down to ${pretify(this._rangeComplete)}`
                }
                break
            }
            case "events": {
                if (this.testRunner.hasEvent) {
                    const ev = this.testRunner.consumeEvent()
                    if (ev === this._eventsComplete[0]) {
                        this._eventsComplete.shift()
                        if (this._eventsComplete.length === 0)
                            this._status = JDTestCommandStatus.Passed
                    } else {
                        this._status = JDTestCommandStatus.Failed
                    }
                    this._progress = `got event ${ev}; remaining = [${this._eventsComplete}]`
                } else {
                    this._progress = `no events received; remaining = [${this._eventsComplete}]`
                }
                break
            }
            case "awaitEvent":
            case "nextEvent":{
                const event = this.command.call.arguments[0] as jsep.Identifier
                this._progress = `waiting for event ${event.name}`
                if (this.testRunner.hasEvent) {
                    const ev = this.testRunner.consumeEvent()
                    if (ev !== event.name) {
                        if (testFun.id === "nextEvent")
                            this._status = JDTestCommandStatus.Failed
                    } else {
                        // this._status = JDTestCommandStatus.Passed
                        this._status = this.checkExpression(this.command.call.arguments[1])
                    }
                } else {
                    this._progress = `no events received; ${this._progress}`
                }
                break
            }
            case "assign": {
                const reg = this.command.call.arguments[0] as jsep.Identifier
                const jdreg = this.testRunner.serviceTestRunner.registers[reg.name]
                const expr = new JDExprEvaluator(
                    this.env,
                    this._startExpressions
                )
                const ev = expr.eval(this.command.call.arguments[1])
                // TODO: generalize
                jdreg.sendSetIntAsync(ev)
                this._status = JDTestCommandStatus.Passed
            }
        }

        function pretify(v: number) {
            return roundWithPrecision(v, 3)
        }
    }
}

export interface JDCommandOutput {
    message: string
    progress: string
}

export class JDTestCommandRunner extends JDEventSource {
    private _status = JDTestCommandStatus.NotReady
    private _output: JDCommandOutput = { message: "", progress: "" }
    private readonly _timeOut = 5000 // timeout
    private _timeLeft = 5000
    private _commmandEvaluator: JDCommandEvaluator = null

    constructor(
        private readonly testRunner: JDTestRunner,
        private readonly command: jdtest.TestCommandSpec
    ) {
        super()
    }

    get status() {
        return this._status
    }

    set status(s: JDTestCommandStatus) {
        if (s != this._status) {
            this._status = s
            this.emit(CHANGE)
        }
    }

    get indeterminate(): boolean {
        return (
            this.status !== JDTestCommandStatus.Failed &&
            this.status !== JDTestCommandStatus.Passed
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
        this.output = { message: "", progress: "" }
        this.status = JDTestCommandStatus.NotReady
        this._commmandEvaluator = null
    }

    start() {
        this.status = JDTestCommandStatus.Active
        this._commmandEvaluator = new JDCommandEvaluator(this.testRunner, this.command)
        this._commmandEvaluator.start()
        this.envChange()
    }

    envChange() {
        if (this._commmandEvaluator) {
            this._commmandEvaluator.evaluate()
            const newOutput: JDCommandOutput = {
                message: this._commmandEvaluator.prompt,
                progress: this._commmandEvaluator.progress,
            }
            this.output = newOutput
            if (this._commmandEvaluator.status === JDTestCommandStatus.RequiresUserInput)
                this.status = JDTestCommandStatus.RequiresUserInput
            else
                this.finish(this._commmandEvaluator.status)
        }
    }

    cancel() {
        this.finish(JDTestCommandStatus.Failed)
    }

    finish(s: JDTestCommandStatus) {
        if (
            (s === JDTestCommandStatus.Failed || s === JDTestCommandStatus.Passed) &&
            (this.status === JDTestCommandStatus.Active ||
                this.status === JDTestCommandStatus.RequiresUserInput)
        ) {
            this.status = s
            this.testRunner.finishCommand()
        }
    }
}

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _commandIndex: number
    private _currentEvent: string = undefined
    public readonly commands: JDTestCommandRunner[]

    constructor(
        public readonly serviceTestRunner: JDServiceTestRunner,
        private readonly testSpec: jdtest.TestSpec
    ) {
        super()
        this.commands = testSpec.testCommands.map(
            c => new JDTestCommandRunner(this, c)
        )
    }

    reset() {
        if (this.status !== JDTestStatus.NotReady) {
            this._status = JDTestStatus.NotReady
            this._commandIndex = undefined
            this.commands.forEach(t => t.reset())
            this.emit(CHANGE)
        }
    }

    start() {
        this.reset()
        this.status = JDTestStatus.Active
        this.commandIndex = 0
        this.serviceTestRunner.refreshEnvironment()
    }

    next() {
        this.serviceTestRunner.next()
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
        return this.testSpec.description
    }

    get prompt() {
        return this.testSpec.prompt
    }

    finish(newStatus: JDTestStatus) {
        if (this.status === JDTestStatus.Active) {
            this.status = newStatus
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

    public eventChange(event: string) {
        this._currentEvent = event;
        this.envChange();
    }

    public get hasEvent() {
        return this._currentEvent != undefined
    }

    public consumeEvent() {
        let ret = this._currentEvent
        this._currentEvent = undefined
        return ret
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

async function refresh_env(registers: SMap<JDRegister>) {
    for (const k in registers) {
        const register = registers[k]
        let retry = 0;
        let val: any = undefined
        do {
            await register.refresh()
            val = register.unpackedValue?.[0]
        } while (val === undefined && retry++ < 2)
    }
}

export class JDServiceTestRunner extends JDServiceClient {
    private _testIndex = -1
    private _registers: SMap<JDRegister> = {}
    private _events: SMap<JDEvent> = {}
    public readonly tests: JDTestRunner[]

    constructor(
        public readonly testSpec: jdtest.ServiceTestSpec,
        service: JDService
    ) {
        super(service)
        this.tests = this.testSpec.tests.map(
            t => new JDTestRunner(this, t)
        )
        const serviceSpec = serviceSpecificationFromClassIdentifier(
            service.serviceClass
        )
        this.testSpec.tests.forEach(t => {
            t.events.forEach(eventName => {
                if (!this.events[eventName]) {
                    const pkt = serviceSpec.packets.find(
                        pkt => isEvent(pkt) && pkt.name === eventName
                    )
                    const event = service.event(pkt.identifier)
                    this.events[eventName] = event
                    this.mount(
                        event.subscribe(EVENT, () => {
                            this.currentTest?.eventChange(eventName)
                        })
                    )
                }
            })
            t.registers.forEach(regName => {
                if (!this._registers[regName]) {
                    const pkt = serviceSpec.packets.find(
                        pkt => isRegister(pkt) && pkt.name === regName
                    )
                    const register = service.register(pkt.identifier)
                    this._registers[regName] = register
                    this.mount(
                        register.subscribe(CHANGE, () => {
                            this.currentTest?.envChange()
                        })
                    )
                }
            })
        })
        this.start()
    }
    
    public lookup(root: string, fld: string = ""): any {
        if (root in this.registers) {
            if (!fld)
                return this.registers[root].unpackedValue?.[0]
            else {
                let field = this.registers[root].fields.find(f => f.name === fld)
                return field?.value
            }
        } else if (root in this.events) {
            let field = this.events[root].fields?.find(f => f.name === fld)
            return field?.value
        }
        return undefined
    }

    public refreshEnvironment() {
        refresh_env(this.registers)
    }

    public get registers() {
        return this._registers
    }

    public get events() {
        return this._events
    }

    private get testIndex() {
        return this._testIndex
    }

    private set testIndex(index: number) {
        if (this._testIndex !== index) {
            // stop previous test if needed
            const ct = this.currentTest
            if (ct) {
                if (ct.status === JDTestStatus.Active) {
                    ct.cancel()
                }
            }

            // update test
            this._testIndex = index
            this.emit(CHANGE)
        }
    }

    public stats() {
        const r = {
            total: this.tests.length,
            success: 0,
            failed: 0,
            indeterminate: 0,
        }
        for (const test of this.tests) {
            switch (test.status) {
                case JDTestStatus.Failed:
                    r.failed++
                    break
                case JDTestStatus.Passed:
                    r.success++
                    break
                default:
                    r.indeterminate++
            }
        }
        return r
    }

    public start() {
        this.tests.forEach(t => t.reset())
        this.testIndex = 0
    }

    public next() {
        this.testIndex++
    }

    get currentTest() {
        return this.tests[this._testIndex]
    }

    set currentTest(test: JDTestRunner) {
        const index = this.tests.indexOf(test)
        if (index > -1) this.testIndex = index
    }
}
