export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus } from "../jdom/bus"
import { createNodeSocketTransport } from "../jdom/transport/nodesocket"
import { compile, testCompiler } from "./compiler"
import { Runner } from "./executor"

function mainTest() {
    const fs = require("fs")
    const path = require("path")
    const args = process.argv.slice(2)
    const f0 = args[0]

    if (/compiler-test/.test(f0)) {
        for (const fn of args) {
            console.log(`*** test ${fn}`)
            testCompiler(fs.readFileSync(fn, "utf8"))
        }
        return
    }

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
