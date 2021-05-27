import { suite, test } from "mocha"
import { readdirSync, readFileSync } from "fs"
import { basename, dirname, join, extname } from "path"

suite("vm", () => {
    suite("json baselines", () => {
        const dir = "vm/suites"
        const matches = readdirSync("vm/suites").filter(m => /\.json$/.test(m))
        matches.forEach(match => {
            test(match, function (done) {
                const base = basename(match)
                const jsonpath = join(dir, match)
                const it4path = join(dir, base + ".it4")

                console.log(`test ${match}`)
                const blocks = JSON.parse(readFileSync(jsonpath, "utf8"))
                const it4 = JSON.parse(readFileSync(it4path, "utf8"))

                // TODO compile blocks and compare that it match it4

                done()
            })
        })
    })
})
