export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus } from "../jdom/bus"
import { createNodeSocketTransport } from "../jdom/transport/nodesocket"
import { compile } from "./compiler"
import { runProgram } from "./executor"

function mainTest() {
    const fs = require("fs")
    const path = require("path")
    const f0 = process.argv[2]
    const pref = path.resolve(f0, "../../../../dist")
    const res = compile(
        {
            write: (fn, cont) => fs.writeFileSync(path.join(pref, fn), cont),
        },
        fs.readFileSync(f0, "utf8")
    )

    if (!res.success) return

    const bus = new JDBus([createNodeSocketTransport()])
    bus.connect()

    runProgram(bus, res.binary, res.dbg)
}

mainTest()