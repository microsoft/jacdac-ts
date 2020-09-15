import { JDDevice } from "./device";
import { JDBus } from "./bus";
import { InPipe } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { DEVICE_CONNECT, DeviceNamerCmd, SELF_ANNOUNCE, CHANGE } from "./constants";
import { toHex, uint8ArrayToString, fromUTF8, strcmp, fromHex, bufferConcat, stringToUint8Array } from "./utils";
import { unpack } from "./struct";
import { Packet } from "./packet";
import { SRV_DEVICE_NAMER } from "../../jacdac-spec/dist/specconstants";

export class RemoteRequestedDevice {
    services: number[] = [];
    boundTo: JDDevice;
    candidates: JDDevice[] = [];

    constructor(
        public parent: DeviceNamerClient,
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
                this.parent.setName(this.boundTo, "")
            this.parent.setName(dev, this.name)
        }
        this.boundTo = dev
    }
}

function recomputeCandidates(bus: JDBus, remotes: RemoteRequestedDevice[]) {
    const localDevs = bus.devices()
    for (let dev of remotes)
        dev.candidates = localDevs.filter(ldev => dev.isCandidate(ldev))
}

function addRequested(devs: RemoteRequestedDevice[], name: string, service_class: number, parent: DeviceNamerClient) {
    let r = devs.find(d => d.name == name)
    if (!r)
        devs.push(r = new RemoteRequestedDevice(parent, name))
    r.services.push(service_class)
    return r
}


export class DeviceNamerClient extends JDServiceClient {
    public remoteRequestedDevices: RemoteRequestedDevice[] = []

    static create(bus: JDBus, print: (s: string) => void = console.log) {
        const namers = bus.services({ serviceClass: SRV_DEVICE_NAMER })
        if (!namers[0])
            return null
        const namer = new DeviceNamerClient(namers[0])
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

    private get bus() {
        return this.service.device.bus
    }

    constructor(service: JDService) {
        super(service)

        this.bus.on(DEVICE_CONNECT, () => {
            recomputeCandidates(this.bus, this.remoteRequestedDevices)
        })

        this.bus.on(SELF_ANNOUNCE, () => {
            if (this.service.device.connected)
                this.scanCore()
        })

        this.scanCore()
    }

    private async scanCore() {
        const inp = new InPipe(this.bus)
        await this.service.sendPacketAsync(
            inp.openCommand(DeviceNamerCmd.ListRequiredNames),
            true)

        const localDevs = this.bus.devices()
        const devs: RemoteRequestedDevice[] = []

        const { meta, output } = await inp.readAll()

        for (const pkt of output) {
            const buf = pkt.data
            if (buf.length == 0)
                continue
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

        this.emit(CHANGE, this.remoteRequestedDevices)
    }

    clearNames() {
        return this.service.sendCmdAsync(DeviceNamerCmd.ClearAllNames, true)
    }

    setName(dev: JDDevice, name: string) {
        const data = bufferConcat(fromHex(dev.deviceId), stringToUint8Array(fromUTF8(name)))
        return this.service.sendPacketAsync(Packet.from(DeviceNamerCmd.SetName, data), true)
    }
}
