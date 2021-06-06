import { VMError } from "./vmutils"

export type GetValue = (e: jsep.MemberExpression | string) => any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StartMap = { e: jsep.Expression; v: any }[]

export type CallEvaluator = (
    ce: jsep.CallExpression,
    ee: VMExprEvaluator
) => any

export function unparse(e: jsep.Expression): string {
    switch (e.type) {
        case "ArrayExpression": {
            const ae = e as jsep.ArrayExpression
            return `[${ae.elements.map(unparse).join(", ")}]`
        }
        case "CallExpression": {
            const caller = e as jsep.CallExpression
            return `${unparse(caller.callee)}(${caller.arguments
                .map(unparse)
                .join(", ")})`
        }
        case "MemberExpression": {
            const root = e as jsep.MemberExpression
            return root.computed
                ? `${unparse(root.object)}[${unparse(root.property)}]`
                : `${unparse(root.object)}.${unparse(root.property)}`
        }
        case "BinaryExpression":
        case "LogicalExpression": {
            const be = e as any
            return `(${unparse(be.left)} ${be.operator} ${unparse(be.right)})`
        }
        case "UnaryExpression": {
            const ue = e as jsep.UnaryExpression
            return `${ue.operator}${unparse(ue.argument)}`
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

export class VMExprEvaluator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private exprStack: any[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private env: GetValue, private callEval: CallEvaluator) {}

    public tos() {
        return this.exprStack[this.exprStack.length - 1]
    }

    public pop() {
        return this.exprStack.pop()
    }

    public eval(e: jsep.Expression) {
        this.exprStack = []
        this.visitExpression(e)
        return this.exprStack.pop()
    }

    public visitExpression(e: jsep.Expression) {
        switch (e.type) {
            case "ArrayExpression": {
                // nothing to do here yet (only used for event function)
                break
            }

            case "CallExpression": {
                if (this.callEval) {
                    let ret = this.callEval(<jsep.CallExpression>e, this)
                    this.exprStack.push(ret)
                } else this.exprStack.push(undefined)
                break
            }

            case "BinaryExpression": {
                const be = <jsep.BinaryExpression>e
                this.visitExpression(be.left)
                this.visitExpression(be.right)
                const right = this.exprStack.pop()
                const left = this.exprStack.pop()
                switch (be.operator) {
                    case "+":
                        this.exprStack.push(left + right)
                        return
                    case "-":
                        this.exprStack.push(left - right)
                        return
                    case "/":
                        this.exprStack.push(left / right)
                        return
                    case "*":
                        this.exprStack.push(left * right)
                        return
                    case "%":
                        this.exprStack.push(left % right)
                        return
                    case ">>":
                        this.exprStack.push(left >> right)
                        return
                    case ">>>":
                        this.exprStack.push(left >>> right)
                        return
                    case "<<":
                        this.exprStack.push(left << right)
                        return
                    case "|":
                        this.exprStack.push(left | right)
                        return
                    case "&":
                        this.exprStack.push(left & right)
                        return
                    case "^":
                        this.exprStack.push(left ^ right)
                        return
                    case "==":
                        this.exprStack.push(left == right)
                        return
                    case "!=":
                        this.exprStack.push(left != right)
                        return
                    case "===":
                        this.exprStack.push(left === right)
                        return
                    case "!==":
                        this.exprStack.push(left !== right)
                        return

                    case "<":
                        this.exprStack.push(left < right)
                        return
                    case ">":
                        this.exprStack.push(left > right)
                        return
                    case "<=":
                        this.exprStack.push(left <= right)
                        return
                    case ">=":
                        this.exprStack.push(left >= right)
                        return
                }
                break
            }

            case "UnaryExpression": {
                const ue = <jsep.UnaryExpression>e
                this.visitExpression(ue.argument)
                const top = this.exprStack.pop()
                switch (ue.operator) {
                    case "ABS":
                        this.exprStack.push(Math.abs(top))
                        return
                    case "!":
                        this.exprStack.push(!top)
                        return
                    case "~":
                        this.exprStack.push(~top)
                        return
                    case "-":
                        this.exprStack.push(-top)
                        return
                    case "+":
                        this.exprStack.push(+top)
                        return
                }
                break
            }

            case "LogicalExpression": {
                const le = <jsep.LogicalExpression>e
                this.visitExpression(le.left)
                switch (le.operator) {
                    case "||":
                        if (this.tos()) return
                        else this.visitExpression(le.right)
                        return
                    case "&&":
                        if (!this.tos()) return
                        else this.visitExpression(le.right)
                        return
                    default:
                }
                break
            }
            case "MemberExpression": {
                // for now, we don't support evaluation of obj or prop
                // of obj.prop
                const val = this.env(e as jsep.MemberExpression)
                if (val === undefined) {
                    throw new VMError(`lookup of ${unparse(e)} failed`)
                }
                this.exprStack.push(val)
                return
            }
            case "Identifier": {
                const id = <jsep.Identifier>e
                const val = this.env(id.name)
                if (val === undefined)
                    throw new VMError(`lookup of ${id.name} failed`)
                this.exprStack.push(val)
                return
            }
            case "Literal": {
                const lit = <jsep.Literal>e
                this.exprStack.push(lit.value)
                return
            }
            default:
        }
    }
}
