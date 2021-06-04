import { suite, test } from "mocha"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import VMFile from "../../src/vm/vmfile"

suite("vm", () => {
    suite("json baselines", () => {
        const dir = "vm/suites"
        const matches = readdirSync("vm/suites").filter(m => /\.json$/.test(m))
        matches.forEach(match => {
            test(match, function (done) {
                const jsonpath = join(dir, match)

                console.log(`test ${match}`)
                const file: VMFile = JSON.parse(readFileSync(jsonpath, "utf8"))
                const { xml, program } = file

                // TODO compile blocks and compare that it match vm

                done()
            })
        })
    })
})
