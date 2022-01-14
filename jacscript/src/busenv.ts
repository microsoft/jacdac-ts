import { JacsEnv, JacsRoleMgr } from "./env"
import {
    addServiceProvider,
    CHANGE,
    DEVICE_CONNECT,
    DEVICE_DISCONNECT,
    JDBus,
    JDDevice,
    Packet,
    PACKET_PROCESS,
    printPacket,
    Scheduler,
    SRV_ROLE_MANAGER,
    RoleManagerServer,
} from "jacdac-ts"

export class JDBusJacsEnv implements JacsEnv {
    private scheduler: Scheduler
    roleManager: JacsRoleMgr

    constructor(private bus: JDBus) {
        this.scheduler = this.bus.scheduler
        this.bus.on(DEVICE_DISCONNECT, dev => this.onDisconnect?.(dev))
        this.bus.on(DEVICE_CONNECT, dev => this.onConnect?.(dev))
        this.bus.on(PACKET_PROCESS, pkt => this.onPacket?.(pkt))

        addServiceProvider(this.bus, {
            name: "JacScript Helper",
            serviceClasses: [SRV_ROLE_MANAGER],
            services: () => {
                const serv = new RoleManagerServer(this.bus, "jacsRoles")
                this.roleManager = new BusRoleManager(serv)
                return [serv]
            },
        })
    }

    send(pkt: Packet): void {
        pkt = pkt.clone()
        console.log(new Date(), "SEND", printPacket(pkt))
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

export class BusRoleManager implements JacsRoleMgr {
    onAssignmentsChanged: () => void

    constructor(private rolemgr: RoleManagerServer) {
        this.rolemgr.on(CHANGE, () => this.onAssignmentsChanged?.())
    }

    setRoles(roles: JacsRole[]): void {
        const prev = this.onAssignmentsChanged
        this.onAssignmentsChanged = null
        for (const r of roles) this.rolemgr.addRole(r.name, r.classIdenitifer)
        this.onAssignmentsChanged = prev
    }

    getRole(
        name: string
    ): { device: JDDevice; serviceIndex: number } | undefined {
        return this.rolemgr.getRole(name)
    }
}

export interface JacsRole {
    name: string
    classIdenitifer: number
}
