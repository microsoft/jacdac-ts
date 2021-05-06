

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