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
            return root.computed
                ? `${processExpr(root.object)}[${processExpr(root.property)}]`
                : `${processExpr(root.object)}.${processExpr(root.property)}`
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
            return `${processExpr(event)}.sub(() => {`
        }
        case "awaitChange": {
            return  `${processExpr(args[0])}.onChange(${processExpr(args[1])}, () => {`
        }
        case "awaitRegister": {
            return  `${processExpr(args[0])}.onChange(0, () => {`
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
        // interpret as a service command (role.comand)
        return ""
    }
    const inst = getInst(cmd)
    switch (inst) {
        case "writeRegister":
        case "writeLocal":
    }
    return ""
}

/*
public async evaluate(): Promise<VMInternalStatus> {
        if (!this._started) {
            const neededStart = await this.startAsync()
            this._started = true
            if (neededStart) return VMInternalStatus.Running
        }
        const args = this.cmd.command.arguments
        if (this.cmd.command.callee.type === "MemberExpression") {
            // interpret as a service command (role.comand)
            const expr = this.newEval()
            const values: atomic[] = []
            for (const a of this.cmd.command.arguments) {
                values.push(await expr.evalAsync(a))
            }
            await this.env.sendCommandAsync(
                this.cmd.command.callee as jsep.MemberExpression,
                values
            )
            return VMInternalStatus.Completed
        }
        switch (this.inst) {

            case "writeRegister":
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



