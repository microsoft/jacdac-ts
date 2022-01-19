import { suite, test } from "mocha"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { VMProgram } from "../../src/vm/ir"

suite("vm", () => {
    suite("json baselines", () => {
        const dir = "vm/suites"
        const matches = readdirSync("vm/suites").filter(m => /\.json$/.test(m))
        matches.forEach(match => {
            test(match, function (done) {
                const jsonpath = join(dir, match)

                console.log(`test ${match}`)
                const program: VMProgram = JSON.parse(
                    readFileSync(jsonpath, "utf8")
                )
                // TODO: spin up bus and RoleManager
                // const runner = new VMProgramRunner(null, program)
                // runner.startAsync()
                done()
            })
        })
    })
})
