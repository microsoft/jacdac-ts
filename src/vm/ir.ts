export interface VMError {
    sourceId?: string
    code?: number
    message: string
}

export interface VMBase {
    type: "ite" | "cmd"
    sourceId?: string
}

export interface VMIfThenElse extends VMBase {
    type: "ite"
    expr: jsep.Expression
    then?: VMBase[]
    else?: VMBase[]
}

export interface VMCommand extends VMBase {
    type: "cmd"
    command: jsep.CallExpression
}

export interface VMHandler {
    commands: VMBase[]
    roles?: string[]
    errors?: VMError[]
    // this handler support the editing experience but
    // should not be compiled down or debugged
    meta?: boolean
}

export interface VMRole {
    role: string
    serviceShortId: string
}

export interface VMProgram {
    roles: VMRole[]
    handlers: VMHandler[]
}

export type VMFunctionNames =
    | "awaitEvent"
    | "awaitRegister"
    | "awaitChange"
    | "awaitCondition"
    | "wait"
    | "writeRegister"
    | "writeLocal"
    | "halt"
    | "label"
    | "jump"
    | "branchOnCondition"
    | "watch"
    | "log"

export const VMFunctions: jdtest.TestFunctionDescription[] = [
    {
        id: "label",
        args: ["Identifier"],
        prompt: `label target {1}`,
        context: "command",
    },
    {
        id: "jump",
        args: ["Identifier"],
        prompt: `jump to label {1}`,
        context: "command",
    },
    {
        id: "branchOnCondition",
        args: ["boolean", "Identifier"],
        prompt: `if {1} then jump to label {2}`,
        context: "command",
    },
    {
        id: "awaitRegister",
        args: ["register"],
        prompt: `wait on register {1} to change value`,
        context: "command",
    },
    {
        id: "awaitChange",
        args: ["register", "number"],
        prompt: `wait for register {1} to change by {2}`,
        context: "command",
    },
    {
        id: "wait",
        args: ["number"],
        prompt: `wait for {1} milliseconds`,
        context: "command",
    },
    {
        id: "watch",
        args: ["number"],
        prompt: `watch expression {1}`,
        context: "command",
    },
    {
        id: "log",
        args: ["number"],
        prompt: `not used`,
        context: "command",
    },
    {
        id: "awaitEvent",
        args: ["event", ["boolean", true]],
        prompt: `wait for event {1} and then check {2} (other events ignored)`,
        context: "command",
    },
    {
        id: "roleBound",
        args: ["Identifier", "Identifier" ],
        prompt: `role {1} {2}`,
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
    {
        id: "nop",
        args: [],
        prompt: `no operation`,
        context: "command",
    },
    {
        id: "onRoleConnected",
        args: ["Identifier"],
        prompt: `fires when a role is connected`,
        context: "command",
    },
    {
        id: "onRoleDisconnected",
        args: ["Identifier"],
        prompt: `fires when a role is disconnected`,
        context: "command",
    },
    {
        id: "start",
        args: [],
        prompt: `start block`,
        context: "command",
    },
]
