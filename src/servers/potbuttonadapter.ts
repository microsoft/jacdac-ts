import {
    REPORT_RECEIVE,
    SRV_BUTTON_EDGE,
    SRV_POTENTIOMETER,
    SystemReg,
} from "../jdom/constants"
import { assert, JDEvent, Packet } from "../jdom/jacdac-jdom"
import RoleManager from "./rolemanager"
import { AdapterServer } from "./buttongestureadapter"


// Adapts a slider to a ButtonEdge with simple thresholding
// TODO adapt to streaming button?
export class PotentiometerToButtonEdgeAdapter extends AdapterServer {
    protected readonly buttonRole: string

    constructor(
        buttonRole: string,
        instanceName?: string,
    ) {
        super(SRV_BUTTON_EDGE, {
            instanceName,
        })

        this.buttonRole = buttonRole
    }

    protected onRoleManager(roleManager: RoleManager) {
        const service = roleManager.getService(this.buttonRole)
        assert(service !== undefined, `no consumed service ${this.buttonRole}`)
        assert(service.serviceClass == SRV_POTENTIOMETER) // TODO can this logic be moved into infrastructure?

        service.register(SystemReg.Reading).on(REPORT_RECEIVE, (packet: Packet) => {
            console.log(packet.data)
            // if (this.lastState == "none") {  // ignore the first sample
            //     if (!packet.data[0] < ) {
            //         this.lastState = "up"
            //     } else {
            //         this.lastState = "down"
            //     }
            // } else if (this.lastState == "up" && !!packet.data[0]) {
            //     this.sendEvent(ButtonEdgeEvent.Down)
            //     this.lastState = "down"
            // } else if (this.lastState == "down" && !packet.data[0]) {
            //     this.sendEvent(ButtonEdgeEvent.Up)
            //     this.lastState = "up"
            // }
        })
    }
}
