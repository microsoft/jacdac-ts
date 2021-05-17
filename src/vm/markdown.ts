import jsep from "jsep"

import { SpecSymbolResolver } from "../../jacdac-spec/spectool/jdutils"
import { IT4Program, IT4Handler, IT4Functions } from "./ir"
import { serviceSpecificationFromName } from "../jdom/spec"

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
        roles: [],
        handlers: [],
    }

    let backticksType = ""
    const errors: jdspec.Diagnostic[] = []
    let lineNo = 0
    let currentHandler: IT4Handler= null
    let handlerHeading = ""
    const symbolResolver = new SpecSymbolResolver(undefined, 
        (role: string) => {
            // lookup in roles first
            let shortId = info.roles.find(pair => pair.role === role)
            if (shortId) {
                // must succeed
                return serviceSpecificationFromName(shortId.serviceShortName)
            } else {
                let service =  serviceSpecificationFromName(role)
                if (!service) {
                    error(`can't find service with shortId=${role}`)
                    return undefined
                }
                return service
            }
        }, 
        supportedExpressions,
        jsep,
        (e) => error(e)
    )

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

    function processCommand(expanded: string) {
        if (!currentHandler) {
            if (!handlerHeading)
                error(`every handler must have a description (via ##)`)
            currentHandler = {
                description: handlerHeading,
                commands: []
            }
            handlerHeading = ""
        }
    
        const ret = symbolResolver.processLine(expanded, IT4Functions);
        
        if (ret) {
            const [command, root] = ret

            if (currentHandler.commands.length === 0) {
                if (command.id === "role") {
                    // TODO: check
                    let role = (root.arguments[0] as jsep.Identifier).name
                    let serviceShortName = (root.arguments[1] as jsep.Identifier).name
                    let service =  serviceSpecificationFromName(serviceShortName)
                    if (!service) 
                        error(`can't find service with shortId=${serviceShortName}`)
                    else if (info.roles.find(pair => pair.role === role))
                        error(`role with name ${role} already declared`)
                    else
                        info.roles.push({role: role, serviceShortName: serviceShortName})
                    return
                } else if (command.id !== "awaitEvent" && command.id !== "awaitCondition") {
                    error(`An ITTT handler must begin with call to an await function (awaitEvent | awaitCondition)`)
                    return
                }
            } else {
                if (command.id === "role") {
                    error(`roles must be declared at beginning of handler`)
                }
            }
        
            currentHandler.commands.push({ guard: undefined, command: root })
        }
    }

    function finishHandler() {
        if (currentHandler.commands.length > 0)
            info.handlers.push(currentHandler)
        currentHandler = null
    }

    function error(msg: string) {
        if (!msg) msg = "syntax error"
        if (errors.some(e => e.line == lineNo && e.message == msg)) return
        errors.push({ file: filename, line: lineNo, message: msg })
    }
}
