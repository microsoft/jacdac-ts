export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus } from "../jdom/bus"
import { createNodeSocketTransport } from "../jdom/transport/nodesocket"
import { compile } from "./compiler"
import { Runner } from "./executor"

function mainTest() {
    const fs = require("fs")
    const path = require("path")
    const f0 = process.argv[2]
    const distPath = path.join(path.dirname(f0), "dist")
    try {
        fs.mkdirSync(distPath)
    } catch {}
    const res = compile(
        {
            write: (fn, cont) =>
                fs.writeFileSync(path.join(distPath, fn), cont),
        },
        fs.readFileSync(f0, "utf8")
    )

    if (!res.success) return

    const bus = new JDBus([createNodeSocketTransport()])
    bus.connect()

    const r = new Runner(bus, res.binary, res.dbg)
    r.onError = () => process.exit(1)
    r.onPanic = code => process.exit(code == 0 ? 0 : 2)
    r.run()
}

mainTest()
