const fs = require("fs")
const path = require("path")
const jacscript = require("../dist/jacscript")

const ctest = "compiler-tests"
const rtest = "run-tests"
const distPath = "dist"
let verbose = false

const args = process.argv.slice(2)
if (args[0] == "-v") {
    args.shift()
    verbose = true
}

async function main() {
    for (const bn of fs.readdirSync(ctest)) {
        const fn = path.join(ctest, bn)
        console.log(`*** test ${fn}`)
        jacscript.testCompiler(fs.readFileSync(fn, "utf8"))
    }

    const bus = jacscript.nodeBus()

    for (const bn of fs.readdirSync(rtest)) {
        const fn = path.join(rtest, bn)
        console.log(`*** run ${fn}`)

        try {
            fs.mkdirSync(distPath)
        } catch { }

        const res = jacscript.compile(
            {
                write: (fn, cont) =>
                    fs.writeFileSync(path.join(distPath, fn), cont),
                log: msg => { if (verbose) console.log(msg) },
            },
            fs.readFileSync(fn, "utf8")
        )

        if (!res.success) process.exit(1)

        const p = new Promise(resolve => {
            const r = new jacscript.Runner(bus, res.binary, res.dbg)
            r.onError = () => process.exit(1)
            r.onPanic = code => {
                if (code == 0)
                    resolve()
                else
                    process.exit(2)
            }
            r.run()
        })

        await p
    }

    process.exit(0)
}

main()
