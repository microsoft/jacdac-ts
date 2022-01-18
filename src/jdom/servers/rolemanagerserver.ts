import { JDBus } from "../bus"
import {
    CHANGE,
    DEVICE_DISCONNECT,
    REGISTER_PRE_GET,
    RoleManagerCmd,
    RoleManagerEvent,
    RoleManagerReg,
    SRV_ROLE_MANAGER,
} from "../constants"
import { JDDevice } from "../device"
import { jdpack } from "../pack"
import { Packet } from "../packet"
import { OutPipe } from "../pipes"
import { JDRegisterServer } from "./registerserver"
import { JDServiceServer } from "./serviceserver"
import { debounce, fromHex, strcmp, toHex } from "../utils"
import { Setting } from "../setting"

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
    toString() {
        const binding = this.device
            ? this.device + ":" + this.serviceIndex
            : "?"
        return `${this.name}[${binding}]`
    }
}

export class RoleManagerServer extends JDServiceServer {
    private roles: Role[] = []
    private assignmentCache: Record<string, string> // role name -> deviceId : serviceIndex
    private autoBindEnabled: JDRegisterServer<[boolean]>

    constructor(private bus: JDBus, readonly roleStore?: Setting) {
        super(SRV_ROLE_MANAGER)

        this.assignmentCache = this.read()

        this.changed = debounce(this.changed.bind(this), 100)

        this.addCommand(RoleManagerCmd.SetRole, this.handleSet.bind(this))
        this.addCommand(RoleManagerCmd.ListRoles, this.handleList.bind(this))
        this.addCommand(
            RoleManagerCmd.ClearAllRoles,
            this.handleClearAssignments.bind(this)
        )

        const alloc = this.addRegister(RoleManagerReg.AllRolesAllocated)
        alloc.on(REGISTER_PRE_GET, () => {
            const allDone = this.roles.every(r => r.isAssigned())
            alloc.setValues([allDone ? 1 : 0])
        })

        this.autoBindEnabled = this.addRegister(RoleManagerReg.AutoBind, [true])

        this.initForBus()
    }

    private changed() {
        console.log("CHANGE: " + this.roles.join(", "))
        this.emit(CHANGE)
        this.sendEvent(RoleManagerEvent.Change)
    }

    private initForBus() {
        for (const r of this.roles) {
            this.setFromCache(r)
        }
        this.bus.scheduler.setInterval(() => this.autoBind(), 980)
        this.bus.on(DEVICE_DISCONNECT, (dev: JDDevice) => {
            let numCleared = 0
            for (const r of this.roles) {
                if (r.device == dev) {
                    r.clear()
                    numCleared++
                }
            }
            if (numCleared) this.changed()
        })
    }

    private autoBind() {
        if (!this.autoBindEnabled.values()[0]) return

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
                    const len = d.serviceLength
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
            this.changed()
        }
    }

    private setFromCache(r: Role) {
        if (r.isAssigned()) return
        const cached = this.assignmentCache[r.name]
        if (typeof cached != "string") return
        const [devId, idx_] = cached.split(":")
        const dev = this.bus.device(devId, true)
        const idx = parseInt(idx_)
        if (!dev || !idx) return
        if (dev.serviceClassAt(idx) != r.classIdentifier) return
        this.setRole(r.name, dev, idx)
    }

    public deleteRoles() {
        this.roles = []
        this.changed()
    }

    public clearAssignments() {
        for (const r of this.roles) r.clear()
        this.assignmentCache = {}
        this.save()
        this.changed()
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
        this.changed()
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
        this.changed()
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
        if (!this.roleStore) return {}

        try {
            return JSON.parse(this.roleStore.get() || "{}")
        } catch (e) {
            console.debug(e)
            return {}
        }
    }

    private save() {
        this.roleStore?.set(JSON.stringify(this.assignmentCache))
    }
}
