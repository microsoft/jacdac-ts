export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus } from "jacdac-ts"
import { createNodeSocketTransport } from "jacdac-ts/node/nodesocket"

export function nodeBus() {
    const bus = new JDBus([createNodeSocketTransport()], {
        disableRoleManager: true
    })
    bus.connect()
    return bus
}
