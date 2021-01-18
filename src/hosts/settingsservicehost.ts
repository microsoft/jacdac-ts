import { SettingsCmd, SRV_SETTINGS } from "../jdom/constants";
import { jdpack, jdunpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import JDServiceHost from "../jdom/servicehost";
import { SMap } from "../jdom/utils";

export default class ServiceSettingsHost extends JDServiceHost {
    private readonly key = "jacdacsettingskeys"
    private settings: SMap<string>;

    constructor() {
        super(SRV_SETTINGS);

        this.addCommand(SettingsCmd.Get, this.handleGet.bind(this));
        this.addCommand(SettingsCmd.Set, this.handleSet.bind(this));
        this.addCommand(SettingsCmd.Delete, this.handleDelete.bind(this));
        this.addCommand(SettingsCmd.ListKeys, this.handleListKeys.bind(this));
        this.addCommand(SettingsCmd.List, this.handleList.bind(this));
        this.addCommand(SettingsCmd.Clear, this.handleClear.bind(this));

        this.settings = this.read();
    }

    private async handleGet(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        const settings = this.read();
        const value = settings[key];
        const secret = /^$/.test(key);

        let payload: Uint8Array;
        if (value === undefined) {
            payload = new Uint8Array(0);
        } else if (secret) {
            const payload = new Uint8Array(1);
            payload[0] = 0;
        } else { // return value
            payload = ServiceSettingsHost.base64ToUint8Array(value);
        }
        const resp = Packet.jdpacked<[string, Uint8Array]>(SettingsCmd.Get, "z b", [key, new Uint8Array(0)]);
        await this.sendPacketAsync(resp);
    }

    private handleSet(pkt: Packet) {
        const [key, value] = pkt.jdunpack<[string, Uint8Array]>("z b");
        const settings = this.read();
        settings[key] = ServiceSettingsHost.uint8ArrayToBase64(value);
        this.save();
    }

    private handleDelete(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        delete this.settings[key];
        this.save();
    }

    private handleList(pkt: Packet) {

    }

    private handleListKeys(pkt: Packet) {

    }

    private handleClear(pkt: Packet) {
        this.settings = {};
        this.save();
    }

    private static base64ToUint8Array(base64: string) {
        const bstring = window.atob(base64);
        const len = bstring.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = bstring.charCodeAt(i);
        }
        return bytes;
    }

    private static uint8ArrayToBase64(bytes: Uint8Array) {
        let binary = '';
        const len = bytes.length;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private read(): SMap<string> {
        try {
            const payload = typeof window !== "undefined" 
                && window.localStorage.getItem(this.key);
            return JSON.parse(payload || "{}")
        }
        catch (e) {
            return {};
        }
    }

    private save(): void {
        try {
            if (typeof window !== "undefined")
                window.localStorage[this.key, JSON.stringify(this.settings)];
        }
        catch (e) {
        }
    }
}