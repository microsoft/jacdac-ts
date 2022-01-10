import { JDDevice, Packet } from "jacdac-ts"

export interface JacsEnv {
    now(): number
    selfDevice: JDDevice

    onDisconnect: (dev: JDDevice) => void
    onConnect: (dev: JDDevice) => void
    onPacket: (pkt: Packet) => void
}
