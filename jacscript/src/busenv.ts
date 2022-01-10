import { JacsEnv } from "./env"
import { JDBus, JDDevice, Packet } from "jacdac-ts"


export class JDBusJacsEnv implements JacsEnv {
    constructor(private bus: JDBus) {}

    now(): number {
        throw new Error("Method not implemented.")
    }
    selfDevice: JDDevice
    onDisconnect: (dev: JDDevice) => void
    onConnect: (dev: JDDevice) => void
    onPacket: (pkt: Packet) => void
}
