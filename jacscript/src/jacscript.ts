export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus, createNodeSocketTransport } from "jacdac-ts"

export function nodeBus() {
    const bus = new JDBus([createNodeSocketTransport()], {
        disableRoleManager: true
    })
    bus.connect()
    return bus
}
