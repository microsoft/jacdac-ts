import { JDDevice } from "./device";
import { JDBus } from "./bus";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { SRV_ROLE_MANAGER, RoleManagerCmd, SELF_ANNOUNCE, CHANGE, DEVICE_ANNOUNCE, ERROR, EVENT, DEVICE_CHANGE } from "./constants";
import { toHex, uint8ArrayToString, fromUTF8, strcmp, fromHex, bufferConcat, stringToUint8Array, debounceAsync } from "./utils";
import Packet from "./packet";
import { jdpack, jdunpack } from "./pack";
import { SystemEvent } from "../../jacdac-spec/dist/specconstants";

const SCAN_DEBOUNCE = 2000

export class RemoteRequestedDevice {
    readonly services: number[] = [];
    boundDevice: JDDevice;
    boundServiceIndex: number;
    candidates: JDDevice[] = [];

    constructor(
        public readonly parent: RoleManagerClient,
        public readonly role: string
    ) { }

    isCandidate(ldev: JDDevice) {
        return this.services.every(s => ldev.hasService(s))
    }

    async select(dev: JDDevice, serviceIndex: number) {
        if (dev == this.boundDevice && serviceIndex === this.boundServiceIndex)
            return // already set
        if (this.parent == null) {
            // setDevName(dev.deviceId, this.name)
        } else {
            if (this.boundDevice)
                await this.parent.setRole(this.boundDevice, this.boundServiceIndex, "")
            await this.parent.setRole(dev, serviceIndex, this.role)
        }
        this.boundDevice = dev
        this.boundServiceIndex = serviceIndex
    }

    toString() {
        let info = `${this.role}:${this.services.map(srv => srv.toString(16)).join()}`
        if (this.boundDevice)
            info += ` -> ${this.boundDevice.shortId}[${this.boundServiceIndex}]`;
        info += ", " + this.candidates.map(c => c.shortId).join();
        return info;
    }
}

export class RoleManagerClient extends JDServiceClient {
    private scanning = false;
    public remoteRequestedDevices: RemoteRequestedDevice[] = []

    constructor(service: JDService) {
        super(service)
        console.log(`rdp: new`)

        const dscan = debounceAsync(this.scan.bind(this), SCAN_DEBOUNCE);
        this.mount(this.bus.subscribe(DEVICE_CHANGE, debounceAsync(async () => {
            this.recomputeCandidates();
            //if (!!this.options?.autoBind)
            //    await this.bindDevices();
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

            const localDevs = this.bus.devices();
            const ordevs = this.remoteRequestedDevices.slice(0);
            const rdevs: RemoteRequestedDevice[] = []

            for (const buf of await inp.readData()) {
                const [devidbuf, serviceClass, serviceIdx, role] = jdunpack<[Uint8Array, number, number, string]>(buf, "b[8] u32 u8 s")
                const devid = toHex(devidbuf);
                console.log({ devidbuf, role, serviceClass })
                const r = this.addRequested(rdevs, role, serviceClass)
                const dev = localDevs.find(d => d.deviceId == devid)
                if (dev) {
                    r.boundDevice = dev
                    r.boundServiceIndex = serviceIdx;
                }
            }

            rdevs.sort((a, b) => strcmp(a.role, b.role))

            if (rdevs.length !== ordevs.length
                || rdevs.some((dev, i) => (dev.role !== ordevs[i].role) || (dev.boundDevice !== ordevs[i].boundDevice))) {
                this.remoteRequestedDevices = rdevs;
                this.recomputeCandidates();
                //if (this.options?.autoBind)
                //    await this.bindDevices();
                console.log(`rdp changed`, this.remoteRequestedDevices)
                this.emit(CHANGE, this.remoteRequestedDevices)
            }

            console.log(`rdp done`)
        }
        catch (e) {
            this.emit(ERROR, e);
        }
        finally {
            this.scanning = false;
        }
    }

    /*
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
    */

    private addRequested(devs: RemoteRequestedDevice[],
        role: string,
        serviceClass: number) {
        let r = devs.find(d => d.role == role)
        if (!r)
            devs.push(r = new RemoteRequestedDevice(this, role))
        r.services.push(serviceClass)
        return r
    }

    private recomputeCandidates() {
        const localDevs = this.bus.devices()
        this.remoteRequestedDevices.forEach(rdev => {
            rdev.candidates = localDevs.filter(ldev => rdev.isCandidate(ldev))
        })
    }

    async clearRoles() {
        await this.service.sendCmdAsync(RoleManagerCmd.ClearAllRoles)
    }

    async setRole(dev: JDDevice, serviceIndex: number, role: string) {
        this.log(`set role ${dev}:${serviceIndex} to ${role}`)
        const data = jdpack<[Uint8Array, number, string]>("b[8] u8 s", [fromHex(dev.deviceId), serviceIndex, role || ""]);
        await this.service.sendPacketAsync(Packet.from(RoleManagerCmd.SetRole, data), true)
    }

    toString() {
        return this.remoteRequestedDevices.map(rdp => rdp.toString()).join('\n')
    }
}
