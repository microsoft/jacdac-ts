import { JacsEnv } from "./env"
import {
    DEVICE_CONNECT,
    DEVICE_DISCONNECT,
    JDBus,
    JDDevice,
    Packet,
    PACKET_PROCESS,
    printPacket,
    Scheduler,
} from "jacdac-ts"

export class JDBusJacsEnv implements JacsEnv {
    private scheduler: Scheduler

    constructor(private bus: JDBus) {
        this.scheduler = this.bus.scheduler
        this.bus.on(DEVICE_DISCONNECT, dev => this.onDisconnect?.(dev))
        this.bus.on(DEVICE_CONNECT, dev => this.onConnect?.(dev))
        this.bus.on(PACKET_PROCESS, pkt => this.onPacket?.(pkt))
    }
    send(pkt: Packet): void {
        pkt = pkt.clone()
        // console.log("send", printPacket(pkt))
        this.bus.sendPacketAsync(pkt)
    }
    devices(): JDDevice[] {
        return this.bus.devices()
    }

    setTimeout(handler: () => void, delay: number) {
        return this.scheduler.setTimeout(handler, delay)
    }
    clearTimeout(handle: any): void {
        return this.scheduler.clearTimeout(handle)
    }

    now(): number {
        return this.scheduler.timestamp
    }

    get selfDevice(): JDDevice {
        return this.bus.selfDevice
    }

    onDisconnect: (dev: JDDevice) => void
    onConnect: (dev: JDDevice) => void
    onPacket: (pkt: Packet) => void
}
