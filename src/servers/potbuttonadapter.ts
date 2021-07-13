import {
    ButtonEdgeEvent,
    PotentiometerReg,
    REPORT_RECEIVE,
    SRV_BUTTON_EDGE,
    SRV_POTENTIOMETER,
    SystemReg,
} from "../jdom/constants"
import { assert, isRegister, jdunpack, Packet, serviceSpecificationFromClassIdentifier } from "../jdom/jacdac-jdom"
import RoleManager from "./rolemanager"
import { AdapterServer } from "./buttongestureadapter"


// Adapts a slider to a ButtonEdge with simple thresholding
// TODO adapt to streaming button?
export class PotentiometerToButtonEdgeAdapter extends AdapterServer {
    protected readonly buttonRole: string
    protected lastState: "none" | "up" | "down" = "none"

    constructor(
        buttonRole: string,
        readonly threshold: number,
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
        const serviceSpecification = serviceSpecificationFromClassIdentifier(
            SRV_POTENTIOMETER
        )
        const potDataSpec = serviceSpecification.packets.find(pkt => isRegister(pkt) && pkt.identifier == PotentiometerReg.Position)


        service.register(SystemReg.Reading).on(REPORT_RECEIVE, (packet: Packet) => {
            const unpackedData = (jdunpack(packet.data, potDataSpec.packFormat) as [number])[0]
            console.log(`${unpackedData} <= ${packet.data} `)

            if (this.lastState == "none") {  // ignore the first sample
                if (unpackedData < this.threshold) {
                    this.lastState = "up"
                } else {
                    this.lastState = "down"
                }
            } else if (this.lastState == "up" && (unpackedData >= this.threshold)) {
                this.sendEvent(ButtonEdgeEvent.Down)
                this.lastState = "down"
                console.log("down")
            } else if (this.lastState == "down" && (unpackedData < this.threshold)) {
                this.sendEvent(ButtonEdgeEvent.Up)
                this.lastState = "up"
                console.log("up")
            }
        })
    }
}
