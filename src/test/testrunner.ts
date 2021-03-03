import {
    testCommandFunctions,
    Commands,
    testExpressionFunctions
} from "../../jacdac-spec/spectool/jdtestfuns"
import { CHANGE, SRV_SPEECH_SYNTHESIS } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import { JDRegister } from "../jdom/register"
import { JDService } from "../jdom/service"
import { JDServiceClient } from "../jdom/serviceclient"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"
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
    Ready,
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

type SMap<T> = { [v: string]: T };

export class JDExprEvaluator {
    private exprStack: any[] = [];

    constructor(private env: SMap<any>) { }

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
                switch(callee.name) {
                    case 'start': 
                        
                        return;
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
                switch(be.operator) {
                    case '+': this.exprStack.push(left + right); return;
                    case '-': this.exprStack.push(left - right); return;
                    case '/': this.exprStack.push(left / right); return;
                    case '*': this.exprStack.push(left * right); return;
                    case '%': this.exprStack.push(left % right); return;
                    
                    case '>>': this.exprStack.push(left >> right); return;
                    case '>>>': this.exprStack.push(left >>> right); return;
                    case '<<': this.exprStack.push(left << right); return;

                    case '|': this.exprStack.push(left | right); return;
                    case '&': this.exprStack.push(left & right); return;
                    case '^': this.exprStack.push(left ^ right); return;

                    case '==': this.exprStack.push(left == right); return;
                    case '!=': this.exprStack.push(left != right); return;
                    case '===': this.exprStack.push(left === right); return;
                    case '!==': this.exprStack.push(left !== right); return;

                    case '<': this.exprStack.push(left < right); return;
                    case '>': this.exprStack.push(left > right); return;
                    case '<=': this.exprStack.push(left <= right); return;
                    case '>=': this.exprStack.push(left >= right); return;
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

// TODO: subscribe to events on the bus to get updates about the device' registers
// TODO: allow subscribers to test event JDEventSource

export class JDTestRunner extends JDEventSource {
    private _status = JDTestStatus.NotReady
    private currentCmd = -1
    private currentCmdStatus = JDCommandStatus.NotStarted
    private commandTimeOut = 10000
    private startExpressions: jsep.CallExpression[] = []

    constructor(private unitTest: jdtest.TestSpec, private done: () => void) {
        super()
        // collect up the start(expr) calls
        unitTest.commands.forEach(cmd => {
            const starts = (<jsep.CallExpression[]>JSONPath({path: "$..*[?(@.type=='CallExpression')]", json: cmd.call.arguments}))
                    .filter((ce:jsep.CallExpression) => (<jsep.Identifier>ce.callee).name === 'start')
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
    
    get description() {
        return this.unitTest.description
    }

    get commands() {
        return this.unitTest.commands
    }

    start() {
        this.status = JDTestStatus.Active
        this.currentCmd = 0
        // evaluate the start conditions and create environment map
    }

    finish(s: JDTestStatus) {
        this.status = s
    }
}

export class JDServiceTestRunner extends JDServiceClient {
    private _testIndex = 0;
    private deviceState: { id: string; reg: JDRegister }[] = []
    private exprStack: any[] = []
    private unitTests: JDTestRunner[] = []

    constructor(private test: jdtest.ServiceTestSpec, service: JDService) {
        super(service)
        this.reset()
    }

    public reset() {
        this.unitTests = []
        this._testIndex = 0
        const spec = serviceSpecificationFromClassIdentifier(
            this.test.serviceClassIdentifier
        )
        // collect up all the registers that are read by the unit tests
        this.test.tests.forEach((ut, index) => {
            this.unitTests.push(new JDTestRunner(ut, () => { 
                if (index > 0 && index < this.test.tests.length) {
                    // when a test has finished, start the next test.
                    this.unitTests[index].status = JDTestStatus.Ready;
                }
            }))
            // TODO: problem here with "position"
            /*ut.registers.forEach(id => {
                if (this.deviceState.findIndex(r => r.id === id) < 0) {
                    const pkt = spec.packets.find(p => { console.log(p.identifierName, id); return p.identifierName === id } )
                    this.deviceState.push({ id: id, reg: this.service.register(pkt.identifier)})
                }
            })*/
        })
        this._testIndex = 0
        this.unitTests[0].status = JDTestStatus.Ready
    }

    public finishTest(status: JDTestStatus) {
        this.currentTest.finish(status)
        if (this._testIndex < this.unitTests.length) {
            this._testIndex++
             this.unitTests[this._testIndex].status = JDTestStatus.Ready
        }
    }

    get tests() {
        return this.unitTests
    }
    get currentTest() {
        return this.unitTests[this._testIndex]
    }
}
