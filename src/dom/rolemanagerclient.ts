import { JDDevice } from "./device";
import { JDBus } from "./bus";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { SRV_ROLE_MANAGER, DEVICE_CONNECT, RoleManagerCmd, SELF_ANNOUNCE, CHANGE, DEVICE_ANNOUNCE } from "./constants";
import { toHex, uint8ArrayToString, fromUTF8, strcmp, fromHex, bufferConcat, stringToUint8Array } from "./utils";
import { unpack } from "./struct";
import Packet from "./packet";

export class RemoteRequestedDevice {
    services: number[] = [];
    boundTo: JDDevice;
    candidates: JDDevice[] = [];

    constructor(
        public parent: RoleManagerClient,
        public name: string
    ) { }

    isCandidate(ldev: JDDevice) {
        return this.services.every(s => ldev.hasService(s))
    }

    select(dev: JDDevice) {
        if (dev == this.boundTo)
            return
        if (this.parent == null) {
            // setDevName(dev.deviceId, this.name)
        } else {
            if (this.boundTo)
                this.parent.setRole(this.boundTo, "")
            this.parent.setRole(dev, this.name)
        }
        this.boundTo = dev
    }
}

function recomputeCandidates(bus: JDBus, remotes: RemoteRequestedDevice[]) {
    const localDevs = bus.devices()
    for (let dev of remotes)
        dev.candidates = localDevs.filter(ldev => dev.isCandidate(ldev))
}

function addRequested(devs: RemoteRequestedDevice[], name: string, service_class: number, parent: RoleManagerClient) {
    let r = devs.find(d => d.name == name)
    if (!r)
        devs.push(r = new RemoteRequestedDevice(parent, name))
    r.services.push(service_class)
    return r
}


export class RoleManagerClient extends JDServiceClient {
    public remoteRequestedDevices: RemoteRequestedDevice[] = []

    static create(bus: JDBus, print: (s: string) => void = console.log) {
        const namers = bus.services({ serviceClass: SRV_ROLE_MANAGER })
        if (!namers[0])
            return null
        const namer = new RoleManagerClient(namers[0])
        namer.on(CHANGE, (devs: RemoteRequestedDevice[]) => {
            let info = ""
            for (const d of devs) {
                info += "D: " + d.name
                if (d.boundTo)
                    info += " -> " + d.boundTo.shortId
                info += "\n"
                for (const c of d.candidates) {
                    info += "  - " + c.shortId + "\n"
                }
            }
            print(info)
        })
        return namer
    }

    constructor(service: JDService) {
        super(service)

        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, () => {
            recomputeCandidates(this.bus, this.remoteRequestedDevices)
        }))

        this.mount(this.bus.subscribe(SELF_ANNOUNCE, () => {
            if (this.service.device.connected)
                this.scanCore()
        }))

        this.scanCore()
    }

    private async scanCore() {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(
            inp.openCommand(RoleManagerCmd.ListRequiredRoles),
            true)

        const localDevs = this.bus.devices()
        const devs: RemoteRequestedDevice[] = []

        for (const buf of await inp.readData()) {
            const devid = toHex(buf.slice(0, 8))
            const [service_class] = unpack(buf, "I", 8)
            const name = fromUTF8(uint8ArrayToString(buf.slice(12)))
            const r = addRequested(devs, name, service_class, this)
            const dev = localDevs.find(d => d.deviceId == devid)
            if (dev)
                r.boundTo = dev
        }

        devs.sort((a, b) => strcmp(a.name, b.name))

        this.remoteRequestedDevices = devs
        recomputeCandidates(this.bus, this.remoteRequestedDevices)

        console.log(`rdp changed`)
        this.emit(CHANGE, this.remoteRequestedDevices)
    }

    clearRoles() {
        return this.service.sendCmdAsync(RoleManagerCmd.ClearAllRoles, true)
    }

    setRole(dev: JDDevice, name: string) {
        const data = bufferConcat(fromHex(dev.deviceId), stringToUint8Array(fromUTF8(name || "")))
        return this.service.sendPacketAsync(Packet.from(RoleManagerCmd.SetRole, data), true)
    }
}
