import { serviceSpecificationFromName } from "../jdom/spec"
import {
    CheckExpression,
    SpecSymbolResolver,
} from "../../jacdac-spec/spectool/jdutils"

export interface IT4GuardedCommand {
    guard?: jsep.Expression
    blocklyId?: string
    command: jsep.CallExpression
}

export interface IT4Handler {
    description?: string
    commands: IT4GuardedCommand[]
}

export interface IT4Role {
    role: string
    serviceShortName: string
}

export interface IT4Program {
    description?: string
    roles: IT4Role[]
    handlers: IT4Handler[]
    errors?: jdspec.Diagnostic[]
}

export const getServiceFromRole = (info: IT4Program) => (role: string) => {
    // lookup in roles first
    let shortId = info.roles.find(pair => pair.role === role)
    if (shortId) {
        // must succeed
        return serviceSpecificationFromName(shortId.serviceShortName)
    } else {
        let service = serviceSpecificationFromName(role)
        return service
    }
}

export interface RoleRegister {
    role: string
    register: string
}

export interface RoleEvent {
    role: string
    event: string
}

export function checkProgram(prog: IT4Program): [RoleRegister[], RoleEvent[]] {
    prog.errors = []
    let errorFun = (e: string) => {
        prog.errors.push({ file: "", line: undefined, message: e })
    }
    const symbolResolver = new SpecSymbolResolver(
        undefined,
        getServiceFromRole(prog),
        errorFun
    )
    const checker = new CheckExpression(symbolResolver, _ => true, errorFun)
    prog.handlers.forEach(h => {
        h.commands.forEach(c => {
            checker.check(c.command, IT4Functions)
        })
    })
    return [
        symbolResolver.registers.map(s => {
            const [root, fld] = s.split(".")
            return { role: root, register: fld }
        }),
        symbolResolver.events.map(e => {
            const [root, fld] = e.split(".")
            return { role: root, event: fld }
        }),
    ]
}

export type JDIT4Functions =
    | "awaitEvent"
    | "awaitRegister"
    | "awaitChange"
    | "awaitCondition"
    | "wait"
    | "writeRegister"
    | "writeLocal"
    | "halt"
    | "role"

export const IT4Functions: jdtest.TestFunctionDescription[] = [
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
        id: "role",
        args: ["Identifier", "Identifier"],
        prompt: `role variable {1} of service type {2}`,
        context: "command",
    },
    {
        id: "awaitEvent",
        args: ["event", ["boolean", true]],
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
