import { CHANGE, SettingsCmd } from "./constants";
import { jdpack, jdunpack } from "./pack";
import Packet from "./packet";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { bufferToString, stringToBuffer } from "./utils";

export default class SettingsClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)
        service.registersUseAcks = true;
    }

    async clear() {
        await this.service.sendCmdAsync(SettingsCmd.Clear);
    }

    async listKeys(): Promise<string[]> {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(inp.openCommand(SettingsCmd.ListKeys), true)
        const { output } = await inp.readAll();
        const keys = output.map(pkt => pkt.stringData);
        return keys.filter(k => !!k)
    }

    async list(): Promise<{ key: string, value?: string }[]> {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(inp.openCommand(SettingsCmd.List), true)
        const { output } = await inp.readAll();
        return output.map(pkt => {
            const [key, valueb] = pkt.jdunpack<[string, Uint8Array]>("z b");
            const value = valueb.length > 0 ? bufferToString(valueb) : undefined;
            return key && { key, value }
        }).filter(kv => !!kv);
    }

    async setValue(key: string, value: string) {
        key = key.trim();
        if (value === undefined) {
            await this.deleteValue(key);
        } else {
            const pkt = Packet.from(SettingsCmd.Set, jdpack("z b", [key, stringToBuffer(value)]));
            await this.service.sendPacketAsync(pkt);
            this.emit(CHANGE);
        }
    }

    async getValue(key: string): Promise<string> {
        if (!key) return undefined;

        key = key.trim();
        const pkt = Packet.from(SettingsCmd.Get, jdpack("s", [key]));
        const resp = await this.service.sendCmdAwaitResponseAsync(pkt);
        const [rkey, value] = jdunpack<[string, Uint8Array]>(resp.data, "z b");
        if (key !== rkey) {
            console.error(`device returned different key, got "${rkey}", expected "${key}"`)
            return undefined;
        }
        return bufferToString(value);
    }


    async deleteValue(key: string) {
        if (!key) return;
        key = key.trim();
        const pkt = Packet.from(SettingsCmd.Delete, jdpack("s", [key]));
        await this.service.sendPacketAsync(pkt);

        this.emit(CHANGE);
    }
}

