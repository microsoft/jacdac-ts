import { SettingsCmd, SettingsEvent, SRV_SETTINGS } from "../jdom/constants";
import { jdpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import { OutPipe } from "../jdom/pipes";
import JDServiceHost from "../jdom/servicehost";
import { bufferToString, SMap, stringToBuffer } from "../jdom/utils";

export default class SettingsServiceHost extends JDServiceHost {
    private settings: SMap<string>;

    constructor(readonly storageKey?: string) {
        super(SRV_SETTINGS);

        this.addCommand(SettingsCmd.Get, this.handleGet.bind(this));
        this.addCommand(SettingsCmd.Set, this.handleSet.bind(this));
        this.addCommand(SettingsCmd.Delete, this.handleDelete.bind(this));
        this.addCommand(SettingsCmd.ListKeys, this.handleListKeys.bind(this));
        this.addCommand(SettingsCmd.List, this.handleList.bind(this));
        this.addCommand(SettingsCmd.Clear, this.handleClear.bind(this));

        this.settings = this.read();
    }

    private getPayload(key: string) {
        const value = this.settings[key];
        const secret = /^$/.test(key);

        let payload: Uint8Array;
        if (value === undefined) {
            payload = new Uint8Array(0);
        } else if (secret) {
            const payload = new Uint8Array(1);
            payload[0] = 0;
        } else { // return value
            payload = stringToBuffer(value);
        }

        return payload;
    }

    private async handleGet(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        const payload = this.getPayload(key);
        const resp = Packet.jdpacked<[string, Uint8Array]>(SettingsCmd.Get, "z b", [key, payload]);
        await this.sendPacketAsync(resp);
    }

    private async handleSet(pkt: Packet) {
        const [key, value] = pkt.jdunpack<[string, Uint8Array]>("z b");
        console.log({ cmd: "set", key, value })
        this.settings[key] = bufferToString(value);
        await this.save();
    }

    private async handleDelete(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        delete this.settings[key];
        await this.save();
    }

    private async handleListKeys(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true);
        await pipe.respondForEach(
            Object.keys(this.settings),
            k => jdpack<[string]>("s", [k])
        )
    }

    private async handleList(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true);
        await pipe.respondForEach(
            Object.keys(this.settings),
            k => {
                const payload = this.getPayload(k);
                return jdpack<[string, Uint8Array]>("z b", [k, payload]);
            });
    }

    private handleClear() {
        this.settings = {};
        this.save();
    }

    private read(): SMap<string> {
        if (!this.storageKey)
            return {};

        try {
            const payload = typeof window !== "undefined"
                && window.localStorage.getItem(this.storageKey);
            return JSON.parse(payload || "{}")
        }
        catch (e) {
            console.log(e)
            return {};
        }
    }

    private async save() {
        if (this.storageKey) {
            try {
                if (typeof window !== "undefined")
                    window.localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
            }
            catch (e) {
                console.log(e)
            }
        }
        await this.sendEvent(SettingsEvent.Change)
    }
}