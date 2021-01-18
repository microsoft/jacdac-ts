import { SettingsCmd, SRV_SETTINGS } from "../jdom/constants";
import { jdpack, jdunpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import { OutPipe } from "../jdom/pipes";
import JDServiceHost from "../jdom/servicehost";
import { SMap } from "../jdom/utils";

export default class SettingsServiceHost extends JDServiceHost {
    private readonly key = "jacdac:settingsservice:1"
    private settings: SMap<string>;

    constructor(readonly useLocalStorage?: boolean) {
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
            payload = SettingsServiceHost.base64ToUint8Array(value);
        }

        return payload;
    }

    private async handleGet(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        const payload = this.getPayload(key);
        const resp = Packet.jdpacked<[string, Uint8Array]>(SettingsCmd.Get, "z b", [key, payload]);
        await this.sendPacketAsync(resp);
    }

    private handleSet(pkt: Packet) {
        const [key, value] = pkt.jdunpack<[string, Uint8Array]>("z b");
        console.log({ cmd: "set", key, value })
        this.settings[key] = SettingsServiceHost.uint8ArrayToBase64(value);
        this.save();
    }

    private handleDelete(pkt: Packet) {
        const [key] = pkt.jdunpack<[string]>("s");
        delete this.settings[key];
        this.save();
    }

    private async handleListKeys(pkt: Packet) {
        const [pipePort] = pkt.jdunpack<[number]>("u16")
        const dev = this.device.bus.device(this.device.deviceId);
        const pipe = new OutPipe(dev, pipePort);
        try {
            const keys = Object.keys(this.settings);
            for (const key of keys) {
                await pipe.send(jdpack<[string]>("s", [key]));
            }
        } catch (e) {
            await pipe.close();
        }
    }

    private async handleList(pkt: Packet) {
        const [pipePort] = pkt.jdunpack<[number]>("u16")
        const dev = this.device.bus.device(this.device.deviceId);
        const pipe = new OutPipe(dev, pipePort);
        try {
            const keys = Object.keys(this.settings);
            for (const key of keys) {
                const payload = this.getPayload(key);
                await pipe.send(jdpack<[string, Uint8Array]>("z b", [key, payload]));
            }
        } catch (e) {
            await pipe.close();
        }
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
        if (!this.useLocalStorage)
            return {};

        try {
            const payload = typeof window !== "undefined"
                && window.localStorage.getItem(this.key);
            return JSON.parse(payload || "{}")
        }
        catch (e) {
            console.log(e)
            return {};
        }
    }

    private save(): void {
        if (!this.useLocalStorage)
            return;

        try {
            if (typeof window !== "undefined")
                window.localStorage.setItem(this.key, JSON.stringify(this.settings));
        }
        catch (e) {
            console.log(e)
        }
    }
}