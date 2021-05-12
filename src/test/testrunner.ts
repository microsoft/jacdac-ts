import {
    getTestCommandFunctions,
    JDTestFunctions,
} from "../../jacdac-spec/spectool/jdtestfuns"
import { exprVisitor } from "../../jacdac-spec/spectool/jdutils"

import { CHANGE } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { roundWithPrecision } from "../jdom/utils"
import { unparse, JDExprEvaluator, CallEvaluator, StartMap } from "../vm/expr"
import { VMServiceEnvironment } from "../vm/environment"
import { VMCommandStatus} from "../vm/vmrunner"

export enum JDTestStatus {
    NotReady,
    Active,
    Passed,
    Failed,
}

function commandStatusToTestStatus(status: VMCommandStatus) {
    switch (status) {
        case VMCommandStatus.Active:
            return JDTestStatus.Active
        case VMCommandStatus.Passed:
            return JDTestStatus.Passed
        case VMCommandStatus.Failed:
            return JDTestStatus.Failed
        case VMCommandStatus.NotReady:
            return JDTestStatus.NotReady
        case VMCommandStatus.RequiresUserInput:
            return JDTestStatus.Active
    }
}

function cmdToTestFunction(cmd: jdtest.TestCommandSpec) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return getTestCommandFunctions().find(t => t.id == id)
}

class JDCommandEvaluator {
    private _prompt = ""
    private _progress = ""
    private _status = VMCommandStatus.Active
    private _startExpressions: StartMap = []
    private _rangeComplete: number = undefined
    private _eventsComplete: string[] = undefined

    constructor(
        private readonly testRunner: JDTestRunner,
        private readonly command: jdtest.TestCommandSpec
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

    private get env() {
        return (e: jsep.MemberExpression | string) => {
            return this.testRunner.serviceTestRunner.lookup(e)
        }
    }

    private callEval(start: StartMap) : CallEvaluator {
        return (caller: jsep.CallExpression, ee: JDExprEvaluator) => { 
            function getStartVal(e: jsep.Expression) {
                return start.find(r => r.e === e).v
            }
            const callee = <jsep.Identifier>caller.callee
            switch (callee.name) {
                case "start": 
                    return getStartVal(caller.arguments[0]);
                case "closeTo": {
                    const args = caller.arguments
                    const goal = getStartVal(args[1])
                    const error = getStartVal(args[2])
                    ee.visitExpression(args[0])
                    const ev = ee.pop()
                    return  ev >= goal - error && ev <= goal + error
                }
                default: // ERROR
            }
            return null;
        }
    }

    // TODO: define an interface between test runner and command evaluator
    // TODO: so this all can be done modularly
    public start() {
        this._startExpressions = []
        const testFun = cmdToTestFunction(this.command)
        const args = this.command.call.arguments
        const startExprs: jsep.Expression[] = []
        switch (testFun.id as JDTestFunctions) {
            case "check":
            case "awaitEvent":
            case "nextEvent": {
                exprVisitor(null, args, (p, ce: jsep.CallExpression) => {
                    if (ce.type !== "CallExpression") return
                    if ((<jsep.Identifier>ce.callee).name === "start")
                        startExprs.push(ce.arguments[0])
                    else if ((<jsep.Identifier>ce.callee).name === "closeTo") {
                        startExprs.push(ce.arguments[1])
                        startExprs.push(ce.arguments[2])
                    }
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
            case "closeTo": {
                startExprs.push(args[1])
                startExprs.push(args[2])
                break
            }
            case "assign": {
                startExprs.push(args[1])
                break
            }
            case "events": {
                const eventList = this.command.call
                    .arguments[0] as jsep.ArrayExpression
                this._eventsComplete = (eventList.elements as jsep.Identifier[]).map(
                    id => id.name
                )
                break
            }
        }
        // evaluate the start expressions and store the results
        startExprs.forEach(child => {
            if (this._startExpressions.findIndex(r => r.e === child) < 0) {
                const exprEval = new JDExprEvaluator(this.env, this.callEval([]))
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
            return [
                `{${i + 1}:val}`,
                aStart && aStart.v
                    ? roundWithPrecision(aStart.v, 3).toString()
                    : unparse(a),
            ]
        })
        this._prompt =
            testFun.id === "ask" || testFun.id === "say"
                ? this.command.prompt.slice(0)
                : testFun.prompt.slice(0)
        replaceId.forEach(
            p => (this._prompt = this._prompt.replace(p[0], p[1]))
        )
        replaceVal.forEach(
            p => (this._prompt = this._prompt.replace(p[0], p[1]))
        )
    }

    public setEvent(ev: string) {}

    private checkExpression(e: jsep.Expression) {
        const expr = new JDExprEvaluator(this.env, this.callEval(this._startExpressions))
        return expr.eval(e)
            ? VMCommandStatus.Passed
            : VMCommandStatus.Active
    }

    private getStart(e: jsep.Expression) {
        return this._startExpressions.find(r => r.e === e)
    }

    public evaluate() {
        const testFun = cmdToTestFunction(this.command)
        const args = this.command.call.arguments
        this._status = VMCommandStatus.Active
        this._progress = ""
        switch (testFun.id as JDTestFunctions) {
            case "ask": {
                this._status = VMCommandStatus.RequiresUserInput
                break
            }
            case "check": {
                this._status = this.checkExpression(args[0])
                break
            }
            case "closeTo": {
                const goal = this.getStart(args[1])
                const error = this.getStart(args[2])
                const expr = new JDExprEvaluator(
                    this.env,
                    this.callEval(this._startExpressions)
                )
                const ev = expr.eval(args[0]) as number
                if (Math.abs(ev - goal.v) <= error.v)
                    this._status = VMCommandStatus.Passed
                this._progress = `current: ${pretify(ev)}; goal: ${pretify(
                    goal.v
                )}; error: ${pretify(error.v)}`
                break
            }
            case "changes":
            case "increases":
            case "decreases": {
                const regSaved = this._startExpressions.find(
                    r => r.e === args[0]
                )
                const regValue = this.env(unparse(args[0]))
                const status =
                    regValue &&
                    regSaved.v &&
                    ((testFun.id === "changes" && regValue !== regSaved.v) ||
                        (testFun.id === "increases" && regValue > regSaved.v) ||
                        (testFun.id === "decreases" && regValue < regSaved.v))
                        ? VMCommandStatus.Passed
                        : VMCommandStatus.Active
                this._status = status
                regSaved.v = regValue
                break
            }
            case "increasesBy":
            case "decreasesBy": {
                const regSaved = this.getStart(args[0])
                const amtSaved = this.getStart(args[1])
                const regValue = this.env(unparse(args[0]))
                if (testFun.id === "increasesBy") {
                    if (regValue >= regSaved.v + amtSaved.v) {
                        this._status = VMCommandStatus.Passed
                    } else if (
                        regValue >= regSaved.v &&
                        regValue < regSaved.v + amtSaved.v
                    ) {
                        this._status = VMCommandStatus.Active
                        this._progress = `current: ${pretify(
                            regValue
                        )}, goal: ${pretify(regSaved.v + amtSaved.v)}`
                    } else {
                        this._status = VMCommandStatus.Active
                    }
                } else {
                    if (regValue <= regSaved.v - amtSaved.v) {
                        this._status = VMCommandStatus.Passed
                        this._progress = "completed"
                    } else if (
                        regValue <= regSaved.v &&
                        regValue > regSaved.v - amtSaved.v
                    ) {
                        this._status = VMCommandStatus.Active
                        this._progress = `current: ${pretify(
                            regValue
                        )} goal: ${pretify(regSaved.v - amtSaved.v)}`
                    } else {
                        this._status = VMCommandStatus.Active
                    }
                }
                break
            }
            case "stepsUpTo":
            case "stepsDownTo": {
                this._status = VMCommandStatus.Active
                const regValue = this.env(unparse(args[0]))
                const beginSaved = this.getStart(args[0])
                const endSaved = this.getStart(args[1])
                if (this._rangeComplete === undefined) {
                    this._rangeComplete = regValue
                } else {
                    if (
                        regValue ===
                        this._rangeComplete +
                            (testFun.id == "stepsUpTo" ? 1 : -1)
                    )
                        this._rangeComplete = regValue
                    if (this._rangeComplete === endSaved.v) {
                        this._status = VMCommandStatus.Passed
                    }
                }
                if (this._rangeComplete != undefined) {
                    this._progress =
                        testFun.id == "stepsUpTo"
                            ? `from ${pretify(beginSaved.v)} up to ${pretify(
                                  this._rangeComplete
                              )}`
                            : `from ${pretify(beginSaved.v)} down to ${pretify(
                                  this._rangeComplete
                              )}`
                }
                break
            }
            case "events": {
                if (this.testRunner.hasEvent) {
                    const ev = this.testRunner.consumeEvent()
                    if (ev === this._eventsComplete[0]) {
                        this._eventsComplete.shift()
                        if (this._eventsComplete.length === 0)
                            this._status = VMCommandStatus.Passed
                    } else {
                        this._status = VMCommandStatus.Failed
                    }
                    this._progress = `got event ${ev}; remaining = [${this._eventsComplete}]`
                } else {
                    this._progress = `no events received; remaining = [${this._eventsComplete}]`
                }
                break
            }
            case "awaitEvent":
            case "nextEvent": {
                const event = args[0] as jsep.Identifier
                this._progress = `waiting for event ${event.name}`
                if (this.testRunner.hasEvent) {
                    const ev = this.testRunner.consumeEvent()
                    if (ev !== event.name) {
                        if (testFun.id === "nextEvent")
                            this._status = VMCommandStatus.Failed
                    } else {
                        // this._status = JDTestCommandStatus.Passed
                        this._status = this.checkExpression(
                            this.command.call.arguments[1]
                        )
                    }
                } else {
                    this._progress = `no events received; ${this._progress}`
                }
                break
            }
            case "assign": {
                const expr = new JDExprEvaluator(
                    this.env,
                    this.callEval(this._startExpressions)
                )
                const ev = expr.eval(args[1])
                const reg = args[0] as jsep.Identifier
                if (this.testRunner.serviceTestRunner.writeRegister(reg.name, ev)) {
                    this._status = VMCommandStatus.Passed
                    this._progress = `wrote ${ev} to register ${reg.name}`
                }
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
    private _status = VMCommandStatus.NotReady
    private _output: JDCommandOutput = { message: "", progress: "" }
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

    set status(s: VMCommandStatus) {
        if (s != this._status) {
            this._status = s
            this.emit(CHANGE)
        }
    }

    get indeterminate(): boolean {
        return (
            this.status !== VMCommandStatus.Failed &&
            this.status !== VMCommandStatus.Passed
        )
    }

    get isActive(): boolean {
        return (
            this.status === VMCommandStatus.Active ||
            this.status === VMCommandStatus.RequiresUserInput
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
        this.status = VMCommandStatus.NotReady
        this.output = { message: "", progress: "" }
        this._commmandEvaluator = null
    }

    start() {
        this.status = VMCommandStatus.Active
        this._commmandEvaluator = new JDCommandEvaluator(
            this.testRunner,
            this.command
        )
        this._commmandEvaluator.start()
        this.envChange()
    }

    envChange() {
        if (this.isActive) {
            this._commmandEvaluator.evaluate()
            const newOutput: JDCommandOutput = {
                message: this._commmandEvaluator.prompt,
                progress: this._commmandEvaluator.progress,
            }
            this.output = newOutput
            if (
                this._commmandEvaluator.status ===
                VMCommandStatus.RequiresUserInput
            )
                this.status = VMCommandStatus.RequiresUserInput
            else this.finish(this._commmandEvaluator.status)
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
            this.testRunner.finishCommand()
        }
    }
}

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private _commandIndex: number
    private _currentEvent: string
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

    public reset() {
        if (this.status !== JDTestStatus.NotReady) {
            this._status = JDTestStatus.NotReady
            this._commandIndex = undefined
            this._currentEvent = undefined
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
        if (this.status === JDTestStatus.Active) {
            this.currentCommand?.envChange()
        }
    }

    public eventChange(event: string) {
        if (this.status === JDTestStatus.Active) {
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
        if (this.commandIndex === this.commands.length - 1)
            this.finish(commandStatusToTestStatus(this.currentCommand.status))
        else this.commandIndex++
    }

    get currentCommand() {
        return this.commands[this._commandIndex]
    }
}

export class JDServiceTestRunner extends JDServiceClient {
    private _testIndex = -1
    private _env: VMServiceEnvironment;
    public readonly tests: JDTestRunner[]

    constructor(
        public readonly testSpec: jdtest.ServiceTestSpec,
        service: JDService
    ) {
        super(service)
        this._env = new VMServiceEnvironment(service)
        this.tests = this.testSpec.tests.map(t => new JDTestRunner(this, t))
        this.testSpec.tests.forEach(t => {
            t.events.forEach(eventName => {
                this._env.registerEvent(eventName, () => { this.currentTest?.eventChange(eventName) })
            })
            t.registers.forEach(regName => {
                this._env.registerRegister(regName, () => { this.currentTest?.envChange() })
            })
        })
        this.start()
    }

    public refreshEnvironment() {
        this._env.refreshEnvironment();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public lookup(e: jsep.MemberExpression | string): any {
        return this._env.lookup(e)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public writeRegister(regName: string, val: any) {
        return this._env.writeRegister(regName, val)
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
