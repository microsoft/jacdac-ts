export interface IT4GuardedCommand {
    guard?: jsep.Expression;
    command: jsep.CallExpression
}

export interface IT4Handler {
    description: string
    wait: IT4GuardedCommand
    commands: IT4GuardedCommand[]
}

export interface IT4Program {
    description: string
    handlers: IT4Handler[]
    errors?: jdspec.Diagnostic[]
}

export type JDIT4Functions =
    | "awaitEvent"
    | "assign"

export const IT4Functions: jdtest.TestFunctionDescription[] = [
    {
        id: "awaitEvent",
        args: ["event", ["boolean", true] ],
        prompt: `wait for event {1} and then check {2} (other events ignored)`,
        context: "command",
    },
    {
        id: "assign",
        args: ["register", "number"],
        prompt: `write value {2:val} to {1}`,
        context: "command",
    },
]