import { Test } from "mocha";
import { testCommandFunctions, Commands, testExpressionFunctions } from "../../jacdac-spec/spectool/jdtestfuns"
import { JDRegister } from "../jdom/register"
import { JDService } from "../jdom/service";
import { JDServiceClient } from "../jdom/serviceclient";
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"

export enum CommandStatus {
    NotStarted,
    Suceeded,
    Failed,
    InProgress,
    TimedOut
}

export enum TestStatus {
    NotStarted,
    Active,
    Passed,
    Failed,
}

export function cmdToTestFunction(cmd: jdtest.UnitTestCommand) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return testCommandFunctions.find(t => t.id == id);
}

export function cmdToPrompt(cmd: jdtest.UnitTestCommand) {
    return cmd.prompt ? cmd.prompt : cmdToTestFunction(cmd).prompt;
}

// TODO: subscribe to events on the bus to get updates about the device' registers
// TODO: allow subscribers to test event JDEventSource

export class CommandRunner {

}

export class UnitTestRunner {
    _status: TestStatus = TestStatus.NotStarted 
    private currentCmd: number = -1;
    private currentCmdStatus: CommandStatus = CommandStatus.NotStarted;
    private commandTimeOut: number = 10000;
    constructor(private unitTest: jdtest.UnitTest, private _index: number) {
    }

    get status() { return this._status }
    get index() { return this._index }
    get description() { return this.unitTest.description; }
    get commands() { return this.unitTest.commands; }

    start() {
        this._status = TestStatus.Active
        this.currentCmd = 0
    }

    finish(s: TestStatus) {
        this._status = s;
    }
}

export class ServiceTestRunner extends JDServiceClient {
    private _currentTest: UnitTestRunner = null;
    private deviceState: { id: string, reg: JDRegister }[] = [];
    private exprStack: any[] = [];
    private unitTests: UnitTestRunner[] = [];

    constructor(private test: jdtest.ServiceTest, service: JDService) {
        super(service)
        this.start()
    }

    public reset() {
        this.unitTests = []
        this._currentTest = null
        this.start()
    }

    private start() { 
        if (this._currentTest === null) {
            const spec = serviceSpecificationFromClassIdentifier(this.test.serviceClassIdentifier)
            // collect up all the registers that are read by the unit tests
            this.test.tests.forEach((ut,index) => {
                this.unitTests.push(new UnitTestRunner(ut, index));
                ut.registers.forEach(id => {
                    if (this.deviceState.findIndex(r => r.id === id) < 0) {
                        const pkt = spec.packets.find(pkt => pkt.identifierName === id)
                        this.deviceState.push({ id: id, reg: new JDRegister(this.service, pkt.identifier)})
                    }
                })
            })
            this._currentTest = this.unitTests[0]
        }
    }

    public startTest(index: number) {
        // TODO: what about existing test?
        if (0<=index && index < this.unitTests.length) {
            this._currentTest = this.unitTests[index];
            this._currentTest.start();
        }
    }

    public finishTest(status: TestStatus) {
        if (this._currentTest) {
            this._currentTest.finish(status)
            this._currentTest = null
        }
    }

    get testCount() { return this.test.tests.length; }
    get tests() { return this.unitTests; }
    get currentTest() { return this._currentTest; }

    private interpretCommand(cmd: jdtest.UnitTestCommand) {
        const tcf = cmdToTestFunction(cmd);
        switch(<Commands>tcf.id) {
            case 'ask':
            case 'say': {
                // TODO: replace $1...
                // this.currentPrompt = cmd.prompt;
                break
            }
            case 'changes': {
                // subscribe to change of register
                break
            }
            case 'check': {
                break
            }
            case 'decreases':
            case 'decreasesBy':
            case 'increases':
            case 'increasesBy':
            case 'rangesFromDownTo':
            case 'rangesFromUpTo':
            case 'reset':
                // this.currentPrompt = cmdToPrompt(cmd);
                break;
            default:
                return 0;
        }
    }

    // stack-based evaluation
    private visitExpression(e: jsep.Expression) {
        let _this = this
        function tos() {
            return _this.exprStack[_this.exprStack.length-1]
        }
        switch(e.type) {
            case 'CallExpression': {
                let caller = <jsep.CallExpression>e;
                let callee = <jsep.Identifier>caller.callee
                
                break
            }
            case 'BinaryExpression': {
                const be = <jsep.BinaryExpression>e
                this.visitExpression(be.left)
                this.visitExpression(be.right)
                // TODO: pop them and evaluate
                // TODO: push the result
                break
            }
            case 'UnaryExpression':
            case 'LogicalExpression': {
                const le = <jsep.LogicalExpression>e
                this.visitExpression(le.left);
                switch (le.operator) {
                    case '||': 
                        if (tos()) return; else this.visitExpression(le.right)
                        break 
                    case '&&':
                        if (!tos()) return; else this.visitExpression(le.right)
                        break 
                    default: //unreachable
                }
                break
            }
            case 'Identifier':
                // get the value and push
                break
            case 'Literal':
                // push the value
                break
            default:
                // unreachable, as we should have caught at compile time  
        }
    }
}
