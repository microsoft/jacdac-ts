import { testCommandFunctions, Commands } from "../../../jacdac-spec/spectool/jdtestfuns"
import { JDRegister } from "../../../src/jdom/register"
import { JDService } from "../../../src/jdom/service";
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec"

interface TestContext {
    service: JDService;
    test: jdtest.ServiceTest;
    currentTest: number;
    currentCmd: number;
    commandTimeOut: number
    deviceState: { id: string, reg: JDRegister }[];
    exprStack: any[];
}

export function createTestContext(test: jdtest.ServiceTest, service: JDService) {
    const spec = serviceSpecificationFromClassIdentifier(test.serviceClassIdentifier)
    const info: TestContext = {
        service: service,
        test: test,
        currentTest: -1,
        currentCmd: -1,
        commandTimeOut: -1,
        deviceState: [],
        exprStack: []
    }
    // collect up all the registers that are read by the unit tests
    test.tests.forEach(ut => {
        ut.registers.forEach(id => {
            if (info.deviceState.findIndex(r => r.id === id) < 0) {
                const pkt = spec.packets.find(pkt => pkt.identifierName === id)
                info.deviceState.push({ id: id, reg: new JDRegister(service, pkt.identifier)})
            }
        })
    })
    return info
}

export function cmdToTestFunction(cmd: jdtest.UnitTestCommand) {
    const id = (<jsep.Identifier>cmd.call.callee).name
    return testCommandFunctions.find(t => t.id == id);
}

export function cmdToPrompt(cmd: jdtest.UnitTestCommand) {
    return cmd.prompt ? cmd.prompt : cmdToTestFunction(cmd).prompt;
}


// once we have change, 
export function interpretCommand(context: TestContext, cmd: jdtest.UnitTestCommand) {
    const tcf = cmdToTestFunction(cmd);
    switch(<Commands>tcf.id) {
        case 'ask':
        case 'changes':
        case 'check':
        case 'decreases':
        case 'decreasesBy':
        case 'increases':
        case 'increasesBy':
        case 'rangesFromDownTo':
        case 'rangesFromUpTo':
        case 'reset':
        default:
            return 0;
    }
}

// stack-based evaluation
function visitExpression(context: TestContext, e: jsep.Expression) {
    function tos() {
        return context.exprStack[context.exprStack.length-1]
    }
    switch(e.type) {
        case 'CallExpression':
            // TODO: must be start
            // TODO: need to record this expression at start of unit test
            break
        case 'BinaryExpression': {
            const be = <jsep.BinaryExpression>e
            visitExpression(context, be.left)
            visitExpression(context, be.right)
            // TODO: pop them and evaluate
            // TODO: push the result
            break
        }
        case 'UnaryExpression':
        case 'LogicalExpression': {
            const le = <jsep.LogicalExpression>e
            visitExpression(context, le.left);
            switch (le.operator) {
                case '||': 
                    if (tos()) return; else visitExpression(context, le.right)
                    break 
                case '&&':
                    if (!tos()) return; else visitExpression(context, le.right)
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

