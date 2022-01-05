export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import { JDBus } from "../jdom/bus"
import { createNodeSocketTransport } from "../jdom/transport/nodesocket"

export function nodeBus() {
    const bus = new JDBus([createNodeSocketTransport()])
    bus.connect()
    return bus
}
