import { serviceSpecificationFromName } from "../jdom/spec"
import {
    IT4Checker,
    SpecSymbolResolver,
} from "../../jacdac-spec/spectool/jdutils"
import { assert } from "../jdom/utils"

export interface IT4Base {
    type: "ite" | "cmd"
    sourceId?: string
}

export interface IT4IfThenElse extends IT4Base {
    type: "ite"
    expr: jsep.Expression
    then?: IT4Base[]
    else?: IT4Base[]
}

export interface IT4Command extends IT4Base {
    type: "cmd"
    command: jsep.CallExpression
}

export interface IT4Handler {
    commands: IT4Base[]
}

export interface IT4Role {
    role: string
    serviceShortId: string
}

export interface IT4Program {
    roles: IT4Role[]
    handlers: IT4Handler[]
    errors?: jdspec.Diagnostic[]
}

export const getServiceFromRole = (info: IT4Program) => (role: string) => {
    // lookup in roles first
    const shortId = info.roles.find(pair => pair.role === role)
    if (shortId) {
        // must succeed
        const def = serviceSpecificationFromName(shortId.serviceShortId)
        assert(!!def, `service ${shortId.serviceShortId} not resolved`)
        return def
    } else {
        const service = serviceSpecificationFromName(role)
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

export function toIdentifier(id: string) {
    return {
        type: "Identifier",
        name: id,
    } as jsep.Identifier
}

export function toMemberExpression(root: string, field: string | jsep.Expression) {
    return {
        type: "MemberExpression",
        object: toIdentifier(root),
        property: typeof field === "string" ? toIdentifier(field) : field,
        computed: false,
    } as jsep.MemberExpression
}


function handlerVisitor(
    handler: IT4Handler,
    visitITE: (ite: IT4IfThenElse, time: number) => void,
    visitCommand: (c: IT4Command) => void
) {
    handler.commands.forEach(visitBase)

    function visitBase(base: IT4Base) {
        switch (base.type) {
            case "cmd": {
                if (visitCommand) visitCommand(base as IT4Command)
                break
            }
            case "ite": {
                const ite = base as IT4IfThenElse
                if (visitITE) visitITE(ite, 0)
                ite?.else.forEach(visitBase)
                if (visitITE) visitITE(ite, 1)
                ite?.then.forEach(visitBase)
                if (visitITE) visitITE(ite, 2)
            }
        }
    }
}

export function compileProgram(prog: IT4Program) {
    let newProgram: IT4Program = { roles: prog.roles.slice(0), handlers: [] }
    newProgram.handlers = prog.handlers.map(h => {
        return { commands: removeIfThenElse(h) }
    })
    return newProgram
}

function removeIfThenElse(handler: IT4Handler): IT4Base[] {
    let newSequence: IT4Command[] = []
    let labelId = 1
    let labels: { then: string; end: string }[] = []
    handlerVisitor(
        handler,
        (ite, time) => {
            switch (time) {
                case 0: {
                    // create the labels and branch instruction
                    const then = `then_${labelId}`
                    const end = `end_${labelId}`
                    labels.push({ then, end })
                    labelId++
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("branchOnCondition"),
                            arguments: [ ite.expr, toIdentifier(then) ]
                        },
                    })
                }
                case 1: {
                    // insert the jump and then label
                    let { then, end } = labels[labels.length - 1]
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("jump"),
                            arguments: [ toIdentifier("end") ]
                        },
                    })
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("label"),
                            arguments: [ toIdentifier("then") ]
                        },
                    })
                }
                case 2: {
                    let { end } = labels[labels.length - 1]
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("label"),
                            arguments: [ toIdentifier(end) ]
                        },
                    })
                    labels.pop()
                }
            }
        },
        cmd => {
            newSequence.push(cmd)
        }
    )
    return newSequence
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
    const checker = new IT4Checker(symbolResolver, _ => true, errorFun)
    prog.handlers.forEach(h => {
        handlerVisitor(h, undefined, c =>
            checker.checkCommand(c.command, IT4Functions)
        )
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
    | "label"
    | "jump"
    | "branchOnCondition"
    | "role"

export const IT4Functions: jdtest.TestFunctionDescription[] = [
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
