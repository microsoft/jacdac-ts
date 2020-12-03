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
    }

    async clear() {
        await this.service.sendCmdAsync(SettingsCmd.Clear);
    }

    async listKeys(): Promise<string[]> {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(inp.openCommand(SettingsCmd.ListKeys))
        const { output } = await inp.readAll();
        const keys = output.map(pkt => pkt.stringData);
        return keys;
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
        const [rkey, value] = jdunpack(resp.data, "z b");
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

