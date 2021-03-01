import { testCommandFunctions } from "../../../jacdac-spec/spectool/jdtestfuns"

export function cmdToTestFunction(cmd: jsep.CallExpression) {
    const id = (<jsep.Identifier>cmd.callee).name;
    return testCommandFunctions.find(t => t.id == id).prompt;
}

// TODO: find registers to watch
// TODO: prompts