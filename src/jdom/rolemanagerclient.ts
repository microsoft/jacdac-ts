import { JDDevice } from "./device";
import { JDBus } from "./bus";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { SRV_ROLE_MANAGER, RoleManagerCmd, SELF_ANNOUNCE, CHANGE, DEVICE_ANNOUNCE, ERROR, EVENT, DEVICE_CHANGE } from "./constants";
import { toHex, uint8ArrayToString, fromUTF8, strcmp, fromHex, bufferConcat, stringToUint8Array, debounceAsync } from "./utils";
import Packet from "./packet";
import { jdunpack } from "./pack";
import { SystemEvent } from "../../jacdac-spec/dist/specconstants";

const SCAN_DEBOUNCE = 2000

export class RemoteRequestedDevice {
    readonly services: number[] = [];
    boundTo: JDDevice;
    candidates: JDDevice[] = [];

    constructor(
        public readonly parent: RoleManagerClient,
        public readonly name: string
    ) { }

    isCandidate(ldev: JDDevice) {
        return this.services.every(s => ldev.hasService(s))
    }

    async select(dev: JDDevice) {
        if (dev == this.boundTo)
            return
        if (this.parent == null) {
            // setDevName(dev.deviceId, this.name)
        } else {

            if (this.boundTo)
                await this.parent.setRole(this.boundTo, "")
            await this.parent.setRole(dev, this.name)
        }
        this.boundTo = dev
    }

    toString() {
        let info = `${this.name}:${this.services.map(srv => srv.toString(16)).join()}`
        if (this.boundTo)
            info += " -> " + this.boundTo.shortId
        info += ", " + this.candidates.map(c => c.shortId).join();
        return info;
    }
}

export class RoleManagerClient extends JDServiceClient {
    private scanning = false;
    public remoteRequestedDevices: RemoteRequestedDevice[] = []

    constructor(service: JDService, readonly options?: { autoBind?: boolean }) {
        super(service)
        console.log(`rdp: new`)

        const dscan = debounceAsync(this.scan.bind(this), SCAN_DEBOUNCE);
        this.mount(this.bus.subscribe(DEVICE_CHANGE, () => {
            console.log("device change")
        }));
        this.mount(this.bus.subscribe(DEVICE_CHANGE, debounceAsync(async () => {
            this.recomputeCandidates();
            if (!!this.options?.autoBind)
                await this.bindDevices();
        }, SCAN_DEBOUNCE)));
        this.mount(this.service.event(SystemEvent.Change).subscribe(EVENT, dscan));
        dscan();
    }

    async scan() {
        if (this.scanning
            || !this.service.device.connected)
            return;

        try {
            console.log(`rdp start`)
            this.scanning = true;
            const inp = new InPipeReader(this.bus)
            await this.service.sendPacketAsync(
                inp.openCommand(RoleManagerCmd.ListRequiredRoles),
                true)

            const localDevs = this.bus.devices()
            const devs: RemoteRequestedDevice[] = []

            for (const buf of await inp.readData()) {
                const [devidbuf, service_class] = jdunpack<[Uint8Array, number]>(buf, "b[8] u32")
                const devid = toHex(devidbuf);
                const name = fromUTF8(uint8ArrayToString(buf.slice(12)))
                const r = this.addRequested(devs, name, service_class)
                const dev = localDevs.find(d => d.deviceId == devid)
                if (dev)
                    r.boundTo = dev
            }

            devs.sort((a, b) => strcmp(a.name, b.name))

            if (devs.length !== this.remoteRequestedDevices.length
                || devs.some((dev, i) => dev.toString() !== this.remoteRequestedDevices[i].toString())) {
                this.remoteRequestedDevices = devs;
                this.recomputeCandidates();
                if (this.options?.autoBind)
                    await this.bindDevices();
                console.log(`rdp changed`, this.remoteRequestedDevices)
                this.emit(CHANGE, this.remoteRequestedDevices)
            }
        }
        catch (e) {
            this.emit(ERROR, e);
        }
        finally {
            this.scanning = false;
        }
    }

    async bindDevices() {
        this.log(`autobind`);
        // only try once
        const rdevs = this.remoteRequestedDevices.slice(0);
        let rdev: RemoteRequestedDevice;
        do {
            this.recomputeCandidates();
            // find a candidate
            rdev = rdevs
                .find(rdev => !rdev.boundTo || !rdev.candidates?.length);
            if (rdev) {
                // process only once
                rdevs.splice(rdevs.indexOf(rdev), 1);
                // select service
                const dev = rdev.candidates[0];
                this.log(`autobind ${rdev.name} to ${dev}`)
                await rdev.select(dev);
            }
        } while (!!rdev);
    }

    private addRequested(devs: RemoteRequestedDevice[],
        name: string,
        service_class: number) {
        let r = devs.find(d => d.name == name)
        if (!r)
            devs.push(r = new RemoteRequestedDevice(this, name))
        r.services.push(service_class)
        return r
    }

    private recomputeCandidates() {
        const localDevs = this.bus.devices()
        this.remoteRequestedDevices.forEach(rdev => {
            rdev.candidates = localDevs.filter(ldev => rdev.isCandidate(ldev))
        })
    }

    clearRoles() {
        return this.service.sendCmdAsync(RoleManagerCmd.ClearAllRoles, true)
    }

    setRole(dev: JDDevice, name: string) {
        const data = bufferConcat(fromHex(dev.deviceId), stringToUint8Array(fromUTF8(name || "")))
        return this.service.sendPacketAsync(Packet.from(RoleManagerCmd.SetRole, data), true)
    }

    toString() {
        return this.remoteRequestedDevices.map(rdp => rdp.toString()).join('\n')
    }
}
