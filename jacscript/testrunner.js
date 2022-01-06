const fs = require("fs")
const path = require("path")
const jacscript = require("../dist/jacscript")

const ctest = "compiler-tests"
const samples = "samples"
const rtest = "run-tests"
const distPath = "dist"
let verbose = false
let bus = null

function runProgram(fn, delay) {
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

    if (!bus) bus = jacscript.nodeBus()

    return new Promise(resolve => {
        const r = new jacscript.Runner(bus, res.binary, res.dbg)
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

function readdir(folder) {
    return fs.readdirSync(folder).map(bn => path.join(folder, bn))
}

async function main() {
    const args = process.argv.slice(2)
    if (args[0] == "-v") {
        args.shift()
        verbose = true
    }

    if (args.length) {
        verbose = true
        await runProgram(args[0])
    } else {
        for (const fn of readdir(ctest).concat(readdir(samples))) {
            console.log(`*** test ${fn}`)
            jacscript.testCompiler(fs.readFileSync(fn, "utf8"))
        }

        for (const fn of readdir(rtest)) {
            await runProgram(fn, 1)
        }
    }

    process.exit(0)
}

main()
