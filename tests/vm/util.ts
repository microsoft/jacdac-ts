import { JDBus } from "../../src/jdom/bus"
import { compile } from "../../jacscript/src/compiler"
import { Runner } from "../../jacscript/src/executor"

export function runJacScriptProgram(fn: string, bus: JDBus, delay: number = undefined) {
    const res = compile(
        {
            write: (fn, cont) => {},
            log: msg => { } // console.log(msg) },
        },
        fn
    )

    if (!res.success) process.exit(1)

    return new Promise<void>(resolve => {
        console.log(`*** run ${fn}`)
        const r = new Runner(bus, res.binary, res.dbg)
        if (delay !== undefined)
            r.startDelay = delay
        r.onError = () => process.exit(1)
        r.onPanic = code => {
            if (code == 0)
                resolve()
            else
                process.exit(2)
        }
        r.run()
    })
}