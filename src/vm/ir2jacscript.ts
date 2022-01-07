import jsep from "jsep"
import { serviceSpecificationFromClassIdentifier } from "../jdom/spec"
import { VMBase, VMCommand, VMHandler, VMIfThenElse, VMProgram } from "./ir"

// TODO:
// - deal with expressions and syntax for global variables
// - need to make a pass over expressions to find global variables
//   and declare them up front
// - deal with access to fields of register

type JacScriptProgram = {
    program: string[]
    debug: string[]
}

function sanitize(s: string) {
    return s.replace(" ", "_")
}

function processExpression(e: jsep.Expression): [string, string[]] {
    const vars: string[] = []
    return [processExpr(e), vars]

    function processExpr(e: jsep.Expression): string {
        switch (e.type) {
            case "ArrayExpression": {
                const ae = e as jsep.ArrayExpression
                return `[${ae.elements.map(processExpr).join(", ")}]`
            }
            case "CallExpression": {
                const caller = e as jsep.CallExpression
                return `${processExpr(caller.callee)}(${caller.arguments
                    .map(processExpr)
                    .join(", ")})`
            }
            case "MemberExpression": {
                const root = e as jsep.MemberExpression
                if (root.computed) {
                    return `${processExpr(root.object)}[${processExpr(root.property)}]`
                } else {
                    const first = `${processExpr(root.object)}`
                    const second = `${processExpr(root.property)}`
                    if (first.startsWith("$var")) {
                        if (vars.indexOf(second) < 0)
                            vars.push(second)
                        return second
                    } else
                        return `${first}.${second}`
                }
            }
            case "BinaryExpression": {
                const be = e as any
                return `(${processExpr(be.left)} ${be.operator} ${processExpr(be.right)})`
            }
            case "UnaryExpression": {
                const ue = e as jsep.UnaryExpression
                return `${ue.operator}${processExpr(ue.argument)}`
            }
            case "Identifier": {
                return (e as jsep.Identifier).name
            }
            case "Literal": {
                return (e as jsep.Literal).raw
            }
            default:
                return "TODO"
        }
    }
}

function getInst(cmd: VMCommand) {
    return (cmd.command.callee as jsep.Identifier)?.name
}

// these are waits
function processHead(head: VMCommand) {
    const args = head.command.arguments
    const inst = getInst(head)
    switch(inst) {
        case "awaitEvent": {
            const event = args[0] as jsep.MemberExpression
            const [ev] = processExpression(event)
            return `${ev}.sub(() => {`
        }
        case "awaitChange": {
            const [reg] = processExpression(args[0])
            const [delta] = processExpression(args[1])
            return  `${reg}.onChange(${delta}, () => {`
        }
        case "awaitRegister": {
            const [reg] = processExpression(args[0])
            return  `${reg}.onChange(0, () => {`
        }
        case "roleBound": {
            break
        }
        default: {
            // ERROR
        }
    }
    return ""
}

function processCommand(cmd: VMCommand) {
    const args = cmd.command.arguments
    if (cmd.command.callee.type === "MemberExpression") {
        const exprs = args.map(a => processExpression(a)[0]).join(",")
        return `${processExpression(cmd.command.callee as jsep.MemberExpression)[0]}(${exprs})`
    }
    const inst = getInst(cmd)
    switch (inst) {
        case "writeRegister": {
            const rest = cmd.command.arguments.slice(1)
            const exprs = rest.map(a => processExpression(a)[0]).join(",")
            return `${processExpression(args[0])[0]}.write(${exprs})`
        }
        case "writeLocal": {
            // TODO
            return ""
        }
    }
    return "ERROR"
}

/*
public async evaluate(): Promise<VMInternalStatus> {
        switch (this.inst) {
            case "writeLocal": {
                const expr = this.newEval()
                const values: atomic[] = []
                for (const a of this.cmd.command.arguments.slice(1)) {
                    values.push(await expr.evalAsync(a))
                }
                this.trace("eval-end", { expr: unparse(args[1]) })
                const reg = args[0] as jsep.MemberExpression
                if (this.inst === "writeRegister") {
                    await this.env.writeRegisterAsync(reg, values)
                    this.trace("write-after-wait", {
                        reg: unparse(reg),
                        expr: values[0],
                    })
                } else this.env.writeGlobal(reg, values[0])
                return VMInternalStatus.Completed
            }
        }
    }
}

*/

export function toJacScript({ roles, serverRoles, handlers }: VMProgram): JacScriptProgram {
    const program: string[] = []
    const debug: string[] = []
    let tab = 0
    const add = (s:string) => {
        program.push(s)
    }
    // process start blocks
    roles.forEach(r => {
        const spec = serviceSpecificationFromClassIdentifier(
            r.serviceClass
        )
        add(`var ${sanitize(r.role)} = roles.${spec.shortId}()`)
    })
    // find the global variables

    handlers.forEach(h => {
        tab++
        handlerVisitor(h)
        tab--
    })
    return { program, debug }

    function handlerVisitor(
        handler: VMHandler,
    ) {
        if (handler.commands.length === 0)
            return

        const head = handler.commands[0]
        add(processHead(head as VMCommand))
        tab++
        handler.commands.slice(1).forEach(visitBase)
        tab--
        add(`}`)

        function visitBase(base: VMBase) {
            switch (base.type) {
                case "cmd": {
                    add(processCommand(base as VMCommand))
                    break
                }
                case "ite": {
                    const ite = base as VMIfThenElse
                    if (ite) {
                        // TODO
                        add(`if (...) {`)
                        tab++
                        ite.then?.forEach(visitBase)
                        if (ite.else) {
                            tab--
                            add(`} else {`)
                            tab++
                            ite.else.forEach(visitBase)
                            tab--
                        }
                        add(`}`)
                    }
                }
            }
        }
    }
}



