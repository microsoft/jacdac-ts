import { loadServiceSpecifications } from "../src/jdom/spec"
import { readFileSync } from "fs"
import { JDBus } from "../src/jdom/bus"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let specs: any
export function loadSpecifications() {
    if (!specs) {
        specs = JSON.parse(
            readFileSync("../jacdac-spec/dist/services.json", {
                encoding: "utf-8",
            })
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loadServiceSpecifications(specs as any)
    }
}

export function mkBus() {
    loadSpecifications()
    return new JDBus([], {})
}

loadSpecifications()
