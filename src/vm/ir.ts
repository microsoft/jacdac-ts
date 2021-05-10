import jsep from "jsep"
import { exprVisitor } from "../../jacdac-spec/spectool/jdutils"

interface IT4GuardedCommand {
    guard?: jsep.Expression;
    command: jsep.CallExpression
}

interface IT4Handler {
    description: string
    wait: IT4GuardedCommand
    commands: IT4GuardedCommand[]
}

interface IT4Program {
    description: string
    handlers: IT4Handler[]
    errors?: jdspec.Diagnostic[]
}

export type JDIT4Functions =
    | "awaitEvent"
    | "assign"

const IT4Functions: jdtest.TestFunctionDescription[] = [
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


const supportedExpressions: jsep.ExpressionType[] = [
    "MemberExpression",
    "ArrayExpression",
    "BinaryExpression",
    "Identifier",
    "Literal",
    "UnaryExpression",
    "LogicalExpression",
]

export function parseITTTMarkdownToJSON(
    filecontent: string,
    filename = ""
): IT4Program {

    filecontent = (filecontent || "").replace(/\r/g, "")
    const info: IT4Program = {
        description: "",
        handlers: [],
    }

    let backticksType = ""
    const errors: jdspec.Diagnostic[] = []
    let lineNo = 0
    let currentHandler: IT4Handler= null
    let handlerHeading = ""

    try {
        for (const line of filecontent.split(/\n/)) {
            lineNo++
            processLine(line)
        }
    } catch (e) {
        error("exception: " + e.message)
    }

    if (currentHandler) finishHandler()

    if (errors.length) info.errors = errors

    return info

    function processLine(line: string) {
        if (backticksType) {
            if (line.trim() == "```") {
                backticksType = null
                if (backticksType == "default") return
            }
        } else {
            const m = /^```(.*)/.exec(line)
            if (m) {
                backticksType = m[1] || "default"
                if (backticksType == "default") return
            }
        }

        const interpret =
            backticksType == "default" || 
            line.slice(0, 4) == "    " ||
            /^\t/.exec(line)

        if (!interpret) {
            const m = /^(#+)\s*(.*)/.exec(line)
            if (m) {
                handlerHeading = ""
                const [, hd, cont] = m
                if (hd == "#") {
                    if (!info.description)
                        info.description = cont.trim()
                    else 
                        error("use ## to start a handler, not #")
                } else if (hd == "##") {
                    if (currentHandler) finishHandler()
                    handlerHeading = cont.trim()
                }
            }
        } else {
            const expanded = line.replace(/\/\/.*/, "").trim()
            if (!expanded) return
            processCommand(expanded)
        }
    }

    function argsRequiredOptional(args: any[], optional: boolean = false) {
        return args.filter(a => !optional && typeof(a) === "string" || optional && typeof(a) === "object")
    }

    function processCommand(expanded: string) {
        if (!currentHandler) {
            if (!handlerHeading)
                error(`every handler must have a description (via ##)`)
            currentHandler = {
                description: handlerHeading,
                wait: undefined,
                commands: []
            }
            handlerHeading = ""
        }
        const call = /^([a-zA-Z]\w*)\(.*\)$/.exec(expanded)
        if (!call) {
            error(
                `a command must be a call to a registered ITTT function (JavaScript syntax)`
            )
            return
        }
        const [, callee] = call
        const cmdIndex = IT4Functions.findIndex(r => callee == r.id)
        if (cmdIndex < 0) {
            error(`${callee} is not a registered ITTT command function.`)
            return
        }
        const root: jsep.CallExpression = <jsep.CallExpression>jsep(expanded)
        if (
            !root ||
            !root.type ||
            root.type != "CallExpression" ||
            !root.callee ||
            !root.arguments
        ) {
            error(`a command must be a call expression in JavaScript syntax`)
        } else {
            // check for unsupported expression types
            exprVisitor(null, root, (p, c) => {
                if (supportedExpressions.indexOf(c.type) < 0)
                    error(`Expression of type ${c.type} not currently supported`)
            })
            // check arguments
            const command = IT4Functions[cmdIndex]
            const minArgs = argsRequiredOptional(command.args).length
            const maxArgs = command.args.length
            if (root.arguments.length < minArgs)
                error(
                    `${callee} expects at least ${minArgs} arguments; got ${root.arguments.length}`
                )
            else if (root.arguments.length > maxArgs) {
                error(
                    `${callee} expects at most ${maxArgs} arguments; got ${root.arguments.length}`
                )
            }
            else {
                // deal with optional arguments
                let newExpressions: jsep.Expression[] = []
                for(let i = root.arguments.length; i<command.args.length;i++) {
                    let [name, def] = command.args[i] as [string, any] 
                    const lit: jsep.Literal = {
                        type: "Literal",
                        value: def,
                        raw: def.toString(),
                    }
                    newExpressions.push(lit)
                }
                root.arguments = root.arguments.concat(newExpressions)
            }
            currentHandler.commands.push({ guard: undefined, command: root })
        }
    }

    function finishHandler() {
        info.handlers.push(currentHandler)
        currentHandler = null
    }

    function error(msg: string) {
        if (!msg) msg = "syntax error"
        if (errors.some(e => e.line == lineNo && e.message == msg)) return
        errors.push({ file: filename, line: lineNo, message: msg })
    }
}
