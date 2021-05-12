export interface IT4GuardedCommand {
    guard?: jsep.Expression;
    command: jsep.CallExpression
}

export interface IT4Handler {
    description: string
    commands: IT4GuardedCommand[]
}

export interface IT4Program {
    description: string
    handlers: IT4Handler[]
    errors?: jdspec.Diagnostic[]
}

export type JDIT4Functions =
    | "awaitEvent"
    | "awaitCondition"
    | "writeRegister"
    | "writeLocal"
    | "halt"

export const IT4Functions: jdtest.TestFunctionDescription[] = [
    {
        id: "awaitEvent",
        args: ["event", ["boolean", true] ],
        prompt: `wait for event {1} and then check {2} (other events ignored)`,
        context: "command",
    },
    {
        id: "awaitCondition",
        args: ["boolean"],
        prompt: `wait for condition {1}`,
        context: "command",
    },
    {
        id: "writeRegister",
        args: ["register", "number"],
        prompt: `write value {2:val} to {1}`,
        context: "command",
    },
    {
        id: "writeLocal",
        args: ["register", "number"],
        prompt: `write value {2:val} to {1}`,
        context: "command",
    },
    {
        id: "halt",
        args: [],
        prompt: `terminates the current handler`,
        context: "command",
    },
]