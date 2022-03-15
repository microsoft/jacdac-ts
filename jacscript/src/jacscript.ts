export * from "./format"
export * from "./compiler"
export * from "./executor"
export * from "./verify"

import {
    JDBus,
    createNodeSocketTransport,
    SRV_JACSCRIPT_MANAGER,
    JacscriptManagerClient,
    delay,
} from "jacdac-ts"

export function nodeBus() {
    const bus = new JDBus([createNodeSocketTransport()], {
        disableRoleManager: true,
    })
    bus.connect()
    return bus
}

export async function deployBytecode(bus: JDBus, bytecode: Uint8Array) {
    for (let i = 0; i < 10; ++i) {
        const devs = bus.devices({ serviceClass: SRV_JACSCRIPT_MANAGER })
        if (devs.length > 0) {
            for (const d of devs) {
                for (const serv of d.services({
                    serviceClass: SRV_JACSCRIPT_MANAGER,
                })) {
                    await new JacscriptManagerClient(serv).deployBytecode(
                        bytecode,
                        p => {
                            console.log(`deploy to ${d.shortId}; ${p}`)
                        }
                    )
                }
            }
            return
        } else {
            if (i == 0) console.log("waiting for devices to flash")
            await delay(100)
        }
    }

    throw new Error("no devices to deploy to")
}
