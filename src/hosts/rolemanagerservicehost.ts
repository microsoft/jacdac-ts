import { RoleManagerCmd, RoleManagerReg, SRV_ROLE_MANAGER, SystemEvent } from "../jdom/constants";
import { jdpack } from "../jdom/pack";
import { Packet } from "../jdom/packet";
import { OutPipe } from "../jdom/pipes";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";
import { SMap, stringToBuffer, toHex } from "../jdom/utils";

export default class RoleManagerServiceHost extends JDServiceHost {
    // role name -> device/service
    private _roles: {
        role: string;
        deviceId?: string;
        serviceClass: number;
    }[];
    readonly allRolesAllocated: JDRegisterHost<[boolean]>;

    constructor() {
        super(SRV_ROLE_MANAGER)

        this._roles = [];

        this.allRolesAllocated = this.addRegister(RoleManagerReg.AllRolesAllocated, [true]);

        this.addRegister(RoleManagerCmd.GetRole, this.handleGetRole.bind(this));
        this.addRegister(RoleManagerCmd.SetRole, this.handleSetRole.bind(this));
        this.addRegister(RoleManagerCmd.ClearAllRoles, this.handleClearAllRoles.bind(this));
        this.addRegister(RoleManagerCmd.ListStoredRoles, this.handleListStoredRoles.bind(this));
        this.addRegister(RoleManagerCmd.ListRequiredRoles, this.handleListRequiredRoles.bind(this));
    }

    private find(didb: Uint8Array) {
        const did = toHex(didb);
        const entry = this._roles.find(r => r.deviceId === did);
        return entry;
    }

    private async handleGetRole(pkt: Packet) {
        const [did] = pkt.jdunpack<[Uint8Array]>("b[8]")
        const entry = this.find(did)
        this.sendPacketAsync(Packet.from(RoleManagerCmd.GetRole, jdpack<[Uint8Array, string]>("b[8] s", [did, entry?.role || ""])))
    }

    private async handleSetRole(pkt: Packet) {
        const [did, role] = pkt.jdunpack<[Uint8Array, string]>("b[8] s")

        // clear old entry
        const entry = this.find(did);
        if (entry)
            entry.deviceId = undefined;

        // assign new
        if (did && role) {
            const entry = this._roles.find(r => r.role === role);
            if (entry)
                entry.deviceId = toHex(did);
        }

        this.sendEvent(SystemEvent.Change);
    }

    private async handleClearAllRoles(pkt: Packet) {
        this._roles = [];
        this.sendEvent(SystemEvent.Change);
    }

    private async handleListStoredRoles(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true);
        await pipe.respondForEach(
            this._roles,
            entry => jdpack<[Uint8Array, string]>("b[8] s", [
                entry.deviceId ? stringToBuffer(entry.deviceId) : new Uint8Array(0),
                entry.role || ""])
        )
    }

    private async handleListRequiredRoles(pkt: Packet) {
        //? 
    }
}