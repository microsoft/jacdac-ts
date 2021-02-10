import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { RoleManagerCmd, CHANGE, ERROR, EVENT, DEVICE_CHANGE, RoleManagerEvent } from "./constants";
import { toHex, strcmp, fromHex, debounceAsync, groupBy, arrayConcatMany } from "./utils";
import Packet from "./packet";
import { jdpack, jdunpack } from "./pack";
import { addHost, hostDefinitionFromServiceClass } from "../hosts/hosts";

const SCAN_DEBOUNCE = 2000

export class RequestedRole {
    bound: JDService;
    candidates: JDService[] = [];

    constructor(
        readonly parent: RoleManagerClient,
        readonly name: string,
        readonly serviceClass: number
    ) { }

    computeCandidates() {
        const { bus } = this.parent.service.device;
        this.candidates = bus.services({ serviceClass: this.serviceClass });
        // check that bound service is stil update to date
        if (this.candidates.indexOf(this.bound) < 0)
            this.bound = undefined;
    }

    async select(service: JDService) {
        if (service === this.bound)
            return // already set
        if (this.bound)
            await this.parent.setRole(this.bound, "")
        await this.parent.setRole(service, this.name)
        this.bound = service;
    }

    get parentName(): string {
        const parts = this.name.split(/\//g);
        return parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : undefined;
    }

    toString() {
        let info = `${this.name}:${this.serviceClass.toString(16)}`
        if (this.bound)
            info += ` -> ${this.bound}`;
        info += ", " + this.candidates.map(c => c.toString()).join();
        return info;
    }
}

export class RoleManagerClient extends JDServiceClient {
    private scanning = false;
    public requestedRoles: RequestedRole[] = undefined;

    constructor(service: JDService) {
        super(service)
        console.log(`rdp: new`)

        const dscan = debounceAsync(this.scan.bind(this), SCAN_DEBOUNCE);
        this.mount(this.bus.subscribe(DEVICE_CHANGE, debounceAsync(async () => {
            this.recomputeCandidates();
        }, SCAN_DEBOUNCE)));
        const changeEvent = this.service.event(RoleManagerEvent.Change);
        this.mount(changeEvent.subscribe(EVENT, dscan));
        dscan();
    }

    async scan() {
        if (this.scanning
            || !this.service.device.connected)
            return;

        const addRequested = (devs: RequestedRole[], role: string, serviceClass: number) => {
            let r = devs.find(d => d.name == role)
            if (!r) devs.push(r = new RequestedRole(this, role, serviceClass))
            return r
        }

        try {
            console.log(`rdp start`)
            this.scanning = true;
            const inp = new InPipeReader(this.bus)
            await this.service.sendPacketAsync(
                inp.openCommand(RoleManagerCmd.ListRequiredRoles),
                true)

            const localDevs = this.bus.devices();
            const ordevs = this.requestedRoles?.slice(0) || [];
            const rdevs: RequestedRole[] = []

            for (const buf of await inp.readData()) {
                const [devidbuf, serviceClass, serviceIdx, role]
                    = jdunpack<[Uint8Array, number, number, string]>(buf, "b[8] u32 u8 s")
                const devid = toHex(devidbuf);
                console.log({ devidbuf, role, serviceClass })
                const r = addRequested(rdevs, role, serviceClass)
                const srv = localDevs
                    .find(d => d.deviceId == devid)
                    ?.service(serviceIdx);
                if (srv && srv.serviceClass === serviceClass)
                    r.bound = srv;
            }

            rdevs.sort((a, b) => strcmp(a.name, b.name))

            if (rdevs.length !== ordevs.length
                || rdevs.some(
                    (dev, i) => (dev.name !== ordevs[i].name) || (dev.bound !== ordevs[i].bound)
                )
            ) {
                this.requestedRoles = rdevs;
                this.recomputeCandidates();
                console.log(`rdp changed`, this.requestedRoles)
                this.emit(CHANGE, this.requestedRoles)
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

    private recomputeCandidates() {
        this.requestedRoles?.forEach(rdev => rdev.computeCandidates());
    }

    async clearRoles() {
        await this.service.sendCmdAsync(RoleManagerCmd.ClearAllRoles)
    }

    async setRole(service: JDService, role: string) {
        const { device, serviceIndex } = service;
        this.log(`set role ${device}:${serviceIndex} to ${role}`)
        const data = jdpack<[Uint8Array, number, string]>("b[8] u8 s", [fromHex(device.deviceId), serviceIndex, role || ""]);
        await this.service.sendPacketAsync(Packet.from(RoleManagerCmd.SetRole, data), true)
    }

    toString() {
        return (this.requestedRoles || []).map(rdp => rdp.toString()).join('\n')
    }

    startSimulators() {
        if (!this.requestedRoles) return;

        // collect roles that need to be bound
        const todos = groupBy(this.requestedRoles.filter(role => !role.bound)
            .map(role => ({
                role, hostDefinition: hostDefinitionFromServiceClass(role.serviceClass)
            }))
            .filter(todo => !!todo.hostDefinition),
            todo => todo.role.parentName || "");

        // spawn devices with group of devices
        Object.keys(todos).forEach(parentName => {
            const todo = todos[parentName];
            // no parent, spawn individual services
            if (!parentName) {
                todo.forEach(t => addHost(this.bus, t.hostDefinition.services(), t.hostDefinition.name));
            } else { // spawn all services into 1
                addHost(this.bus, arrayConcatMany(todo.map(t => t.hostDefinition.services())), parentName)
            }
        })
        this.requestedRoles.filter(role => !role.bound)
            .map(role => hostDefinitionFromServiceClass(role.serviceClass))
            .filter(hostDefinition => !!hostDefinition)
    }
}
