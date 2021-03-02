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


export class JDCommandRunner {
    // pure interpreter
    private interpretCommand(cmd: jdtest.CommandSpec) {
        const tcf = cmdToTestFunction(cmd)
        switch (<Commands>tcf.id) {
            case "ask":
            case "say": {
                // TODO: replace $1...
                // this.currentPrompt = cmd.prompt;
                break
            }
            case "changes": {
                // subscribe to change of register
                break
            }
            case "check": {
                break
            }
            case "decreases":
            case "decreasesBy":
            case "increases":
            case "increasesBy":
            case "rangesFromDownTo":
            case "rangesFromUpTo":
            case "reset":
                // this.currentPrompt = cmdToPrompt(cmd);
                break
            default:
                return 0
        }
    }

    private tos() {
        // return this.exprStack[this.exprStack.length - 1]
    }

    // stack-based evaluation
    private visitExpression(e: jsep.Expression) {
        switch (e.type) {
            case "CallExpression": {
                const caller = <jsep.CallExpression>e
                const callee = <jsep.Identifier>caller.callee

                break
            }
            case "BinaryExpression": {
                const be = <jsep.BinaryExpression>e
                this.visitExpression(be.left)
                this.visitExpression(be.right)
                // TODO: pop them and evaluate
                // TODO: push the result
                break
            }
            case "UnaryExpression":
            case "LogicalExpression": {
                const le = <jsep.LogicalExpression>e
                this.visitExpression(le.left)
                switch (le.operator) {
                    case "||":
                        // if (this.tos()) return
                        // else this.visitExpression(le.right)
                        break
                    case "&&":
                        // if (!this.tos()) return
                        // else this.visitExpression(le.right)
                        break
                    default: //unreachable
                }
                break
            }
            case "Identifier":
                // get the value and push
                break
            case "Literal":
                // push the value
                break
            default:
            // unreachable, as we should have caught at compile time
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
    constructor(private unitTest: jdtest.TestSpec, private done: () => void) {
        super()
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
                    this.unitTests[index].status = JDTestStatus.Ready;
                }
            }))
            // TODO: problem here with "position"
            /*ut.registers.forEach(id => {
                if (this.deviceState.findIndex(r => r.id === id) < 0) {
                    const pkt = spec.packets.find(p => { console.log(p.identifierName, id); return p.identifierName === id } )
                    this.deviceState.push({ id: id, reg: new JDRegister(this.service, pkt.identifier)})
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
