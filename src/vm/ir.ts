import { serviceSpecificationFromName } from "../jdom/spec"
import {
    VMChecker,
    SpecSymbolResolver,
} from "../../jacdac-spec/spectool/jdutils"
import { assert } from "../jdom/utils"

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
    errors?: VMError[]
}

export interface VMRole {
    role: string
    serviceShortId: string
}

export interface VMProgram {
    roles: VMRole[]
    handlers: VMHandler[]
}

export const getServiceFromRole = (info: VMProgram) => (role: string) => {
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

export function toMemberExpression(
    root: string,
    field: string | jsep.Expression
) {
    return {
        type: "MemberExpression",
        object: toIdentifier(root),
        property: typeof field === "string" ? toIdentifier(field) : field,
        computed: false,
    } as jsep.MemberExpression
}

function handlerVisitor(
    handler: VMHandler,
    visitITE: (ite: VMIfThenElse, time: number) => void,
    visitCommand: (c: VMCommand) => void
) {
    handler.commands.forEach(visitBase)

    function visitBase(base: VMBase) {
        switch (base.type) {
            case "cmd": {
                if (visitCommand) visitCommand(base as VMCommand)
                break
            }
            case "ite": {
                const ite = base as VMIfThenElse
                if (visitITE) visitITE(ite, 0)
                ite?.else?.forEach(visitBase)
                if (visitITE) visitITE(ite, 1)
                ite?.then?.forEach(visitBase)
                if (visitITE) visitITE(ite, 2)
            }
        }
    }
}

export function compileProgram(prog: VMProgram) {
    let newProgram: VMProgram = { roles: prog.roles.slice(0), handlers: [] }
    newProgram.handlers = prog.handlers.map(h => {
        return { commands: removeIfThenElse(h), errors: h?.errors }
    })
    return newProgram
}

function removeIfThenElse(handler: VMHandler): VMBase[] {
    const newSequence: VMCommand[] = []
    const labels: { then: string; end: string }[] = []
    let labelId = 1
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
                            arguments: [ite.expr, toIdentifier(then)],
                        },
                    })
                    break
                }
                case 1: {
                    // insert the jump and then label
                    const { then, end } = labels[labels.length - 1]
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("jump"),
                            arguments: [toIdentifier(end)],
                        },
                    })
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("label"),
                            arguments: [toIdentifier(then)],
                        },
                    })
                    break
                }
                case 2: {
                    assert(labels.length > 0)
                    const { end } = labels[labels.length - 1]
                    newSequence.push({
                        type: "cmd",
                        command: {
                            type: "CallExpression",
                            callee: toIdentifier("label"),
                            arguments: [toIdentifier(end)],
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

export function checkProgram(prog: VMProgram): {
    registers: RoleRegister[]
    events: RoleEvent[],
    errors: VMError[]
} {
    const allErrors: VMError[] = []
    const goodHandlers: VMHandler[] = []
    let currentId: string = undefined
    const errorFun = (e: string) => {
        allErrors.push({ sourceId: currentId, message: e })
    }
    const symbolResolver = new SpecSymbolResolver(
        undefined,
        getServiceFromRole(prog),
        errorFun
    )
    const checker = new VMChecker(symbolResolver, _ => true, errorFun)
    prog.handlers.forEach((h) => {
        if (h?.errors.length) {
            h?.errors.forEach(e => allErrors.push(e))
            return
        }
        const errorCount = allErrors.length
        handlerVisitor(h, undefined, c =>
            checker.checkCommand(c.command, VMFunctions)
        )
        if (h?.errors.length === 0 && allErrors.length === errorCount) {
            goodHandlers.push(h)
        } else {
            h?.errors.forEach(e => allErrors.push(e))
        }
    })
    prog.handlers = goodHandlers

    return {
        registers: symbolResolver.registers.map(s => {
            const [root, fld] = s.split(".")
            return { role: root, register: fld }
        }),
        events: symbolResolver.events.map(e => {
            const [root, fld] = e.split(".")
            return { role: root, event: fld }
        }),
        errors: allErrors
    }
}

export type JDVMFunctions =
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
