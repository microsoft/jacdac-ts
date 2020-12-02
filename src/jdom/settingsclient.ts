import { CHANGE, SettingsCmd } from "./constants";
import Packet from "./packet";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";
import { stringToBuffer } from "./utils";

export default class SettingsClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)
    }

    async listKeys(): Promise<string[]> {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(inp.openCommand(SettingsCmd.ListKeys))
        const { output } = await inp.readAll();
        const keys = output.map(pkt => pkt.stringData);
        return keys;
    }

    async setValue(key: string, value: string) {
        if (value === undefined) {
            await this.deleteValue(key);
        } else {
            const pkt = Packet.from(SettingsCmd.Set, stringToBuffer(key + "\u0000" + value));
            await this.service.sendPacketAsync(pkt);
            this.emit(CHANGE);
        }
    }

    async getValue(key: string): Promise<string> {
        const pkt = Packet.from(SettingsCmd.Get, stringToBuffer(key));
        const resp = await this.service.sendCmdAwaitResponseAsync(pkt);
        return resp?.stringData;
    }


    async deleteValue(key: string) {
        const pkt = Packet.from(SettingsCmd.Delete, stringToBuffer(key));
        await this.service.sendPacketAsync(pkt);

        this.emit(CHANGE);
    }
}

