import {
    CHANGE,
    JDDevice,
    JDServiceServer,
    Packet,
    RoleManagerCmd,
    SRV_ROLE_MANAGER,
    toHex,
    OutPipe,
    jdpack,
    fromHex,
    DEVICE_CHANGE,
    DEVICE_CONNECT,
    DEVICE_DISCONNECT,
    strcmp,
} from "jacdac-ts"

class Role {
    device: JDDevice
    serviceIndex: number
    constructor(public name: string, public classIdentifier: number) {}
    clear() {
        this.device = undefined
        this.serviceIndex = undefined
    }
    isAssigned() {
        return this.device != undefined
    }
    assignment() {
        if (this.isAssigned())
            return this.device.deviceId + ":" + this.serviceIndex
        return undefined
    }
}

export class RoleManagerServer extends JDServiceServer {
    private roles: Role[] = []
    private assignmentCache: Record<string, string> // role name -> deviceId : serviceIndex

    constructor(readonly storageKey?: string) {
        super(SRV_ROLE_MANAGER)

        this.assignmentCache = this.read()

        this.addCommand(RoleManagerCmd.SetRole, this.handleSet.bind(this))
        this.addCommand(RoleManagerCmd.ListRoles, this.handleList.bind(this))
        this.addCommand(
            RoleManagerCmd.ClearAllRoles,
            this.handleClearAssignments.bind(this)
        )

        let initialized = false
        this.on(DEVICE_CHANGE, () => {
            if (initialized || !this.device) return
            initialized = true
            this.initForBus()
        })
    }

    private initForBus() {
        for (const r of this.roles) {
            this.setFromCache(r)
        }
        this.bus.scheduler.setInterval(() => this.autoBind(), 980)
        this.on(DEVICE_DISCONNECT, (dev: JDDevice) => {
            let numCleared = 0
            for (const r of this.roles) {
                if (r.device == dev) {
                    r.clear()
                    numCleared++
                }
            }
            if (numCleared) this.emit(CHANGE)
        })
    }

    private autoBind() {
        const usedBindings: Record<string, boolean> = {}
        let numUnbound = 0
        for (const r of this.roles)
            if (r.isAssigned()) usedBindings[r.assignment()] = true
            else numUnbound++
        if (numUnbound == 0) return

        const devs = this.bus.devices()
        devs.sort((a, b) => strcmp(a.deviceId, b.deviceId))
        const assignedRoles: Role[] = []
        const roles = this.roles.slice()
        roles.sort((a, b) => strcmp(a.name, b.name))
        for (const r of roles) {
            if (!r.isAssigned())
                for (const d of devs) {
                    const len = Math.min(d.serviceLength, 32)
                    for (let i = 1; i < len; ++i) {
                        if (
                            r.classIdentifier == d.serviceClassAt(i) &&
                            !usedBindings[d.deviceId + ":" + i]
                        ) {
                            this.setRoleCore(r.name, d, i)
                            usedBindings[r.assignment()] = true
                            assignedRoles.push(r)
                        }
                    }
                }
        }

        if (assignedRoles.length) {
            this.save()
            this.emit(CHANGE)
        }
    }

    private setFromCache(r: Role) {
        if (r.isAssigned()) return
        const cached = this.assignmentCache[r.name]
        if (typeof cached != "string") return
        const [devId, idx_] = cached.split(":")
        const dev = this.bus.device(devId)
        const idx = parseInt(idx_)
        if (!dev || !idx) return
        if (dev.serviceClassAt(idx) != r.classIdentifier) return
        this.setRole(r.name, dev, idx)
    }

    public deleteRoles() {
        this.roles = []
        this.emit(CHANGE)
    }

    public clearAssignments() {
        for (const r of this.roles) r.clear()
        this.assignmentCache = {}
        this.save()
        this.emit(CHANGE)
    }

    public addRole(name: string, classIdenitifer: number) {
        let r = this.lookup(name)
        if (!r) {
            this.roles.push((r = new Role(name, classIdenitifer)))
        } else {
            if (r.classIdentifier == classIdenitifer) return
            r.classIdentifier = classIdenitifer
            if (r.device) {
                delete this.assignmentCache[r.name]
                this.save()
            }
            r.clear()
        }
        this.setFromCache(r)
        this.emit(CHANGE)
    }

    private setRoleCore(name: string, dev: JDDevice, serviceIndex: number) {
        const r = this.lookup(name)
        if (r) {
            if (r.device == dev && r.serviceIndex == serviceIndex) return
            for (const role of this.roles) {
                if (role.device == dev && role.serviceIndex == serviceIndex) {
                    role.clear()
                    delete this.assignmentCache[role.name]
                }
            }
            r.device = dev
            r.serviceIndex = serviceIndex
            this.assignmentCache[r.name] = r.assignment()
        }
    }

    public setRole(name: string, dev: JDDevice, serviceIndex: number) {
        this.setRoleCore(name, dev, serviceIndex)
        this.save()
        this.emit(CHANGE)
    }

    public getRole(
        name: string
    ): { device: JDDevice; serviceIndex: number } | undefined {
        const r = this.lookup(name)
        if (r) return { device: r.device, serviceIndex: r.serviceIndex }
        else return undefined
    }

    private lookup(name: string) {
        return this.roles.find(r => r.name == name)
    }

    private get bus() {
        return this.device.bus
    }

    private async handleSet(pkt: Packet) {
        const [deviceId, serviceIdx, role] =
            pkt.jdunpack<[Uint8Array, number, string]>("b[8] u8 s")
        const dev = this.bus.device(toHex(deviceId), true, pkt)
        if (dev) this.setRole(role, dev, serviceIdx)
    }

    private async handleList(pkt: Packet) {
        const pipe = OutPipe.from(this.bus, pkt, true)
        await pipe.respondForEach(this.roles, r => {
            const id = r.device ? fromHex(r.device.deviceId) : new Uint8Array(8)
            return jdpack<[Uint8Array, number, number, string]>(
                "b[8] u32 u8 s",
                [id, r.classIdentifier, r.serviceIndex || 0, r.name]
            )
        })
    }

    private handleClearAssignments() {
        this.clearAssignments()
    }

    private read(): Record<string, string> {
        if (!this.storageKey) return {}

        try {
            const payload =
                typeof window !== "undefined" &&
                window.localStorage.getItem(this.storageKey)
            return JSON.parse(payload || "{}")
        } catch (e) {
            console.debug(e)
            return {}
        }
    }

    private save() {
        if (this.storageKey) {
            try {
                if (typeof window !== "undefined")
                    window.localStorage.setItem(
                        this.storageKey,
                        JSON.stringify(this.assignmentCache)
                    )
            } catch (e) {
                console.debug(e)
            }
        }
    }
}
