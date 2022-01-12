import { JDDevice, Packet } from "jacdac-ts"

export interface JacsEnv {
    now(): number
    selfDevice: JDDevice

    setTimeout(handler: () => void, delay: number): any
    clearTimeout(handle: any): void
    devices(): JDDevice[]
    send(pkt: Packet): void

    onDisconnect: (dev: JDDevice) => void
    onConnect: (dev: JDDevice) => void
    onPacket: (pkt: Packet) => void
}
