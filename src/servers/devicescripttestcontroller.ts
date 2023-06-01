import { DevsTestCmd, SRV_DEVS_TEST } from "../jdom/constants"
import { JDServiceServer } from "../jdom/servers/serviceserver"
import { OutPipe } from "../jdom/pipes"
import { Packet } from "../jdom/packet"
import { jdpack } from "../jdom/pack"
import { JDBus } from "../jdom/bus"

export class DeviceScriptTestControllerServer extends JDServiceServer {
    public tests: string[] = []

    constructor(private bus: JDBus) {
        super(SRV_DEVS_TEST)
        this.addCommand(DevsTestCmd.ListTests, this.handleListTests.bind(this))
    }

    private async handleListTests(pkt: Packet) {
        const tests = this.tests.slice(0)
        const pipe = OutPipe.from(this.bus, pkt, true)
        await pipe.respondForEach(tests, r => {
            return jdpack<[string]>("s", [r])
        })
    }
}
