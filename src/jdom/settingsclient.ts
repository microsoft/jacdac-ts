import { SettingsCmd } from "./constants";
import { InPipeReader } from "./pipes";
import { JDService } from "./service";
import { JDServiceClient } from "./serviceclient";

export class SettingsClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)
    }

    async listKeys(): Promise<string[]> {
        const inp = new InPipeReader(this.bus)
        await this.service.sendPacketAsync(
            inp.openCommand(SettingsCmd.ListKeys),
            true)
        const { output } = await inp.readAll();
        const keys = output.map(pkt => pkt.stringData);
        return keys;
    }
}

