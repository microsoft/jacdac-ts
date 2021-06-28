import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import {
    DEVICE_CHANGE,
    LedReg,
    REGISTER_PRE_GET,
    ROLE_BOUND,
    SELF_ANNOUNCE,
} from "../../src/jdom/constants"
import LEDServer, { LEDServiceOptions } from "../../src/servers/ledserver"
import { mkBus } from "../testutils"
import RoleManager from "../../src/servers/rolemanager"

export default class CompositeLEDServer extends LEDServer {
    private roleManager: RoleManager

    constructor(options?: LEDServiceOptions) {
        super(options)

        // when the device is set, connect to bus
        this.emit(DEVICE_CHANGE, () => {
            if (this.device) {
                this.roleManager = new RoleManager(this.device.bus)
                // TODO: use serviceClass instead of serviceShortId
                this.roleManager.setRoles(
                    ["R", "G", "G"].map(role => ({
                        role,
                        serviceShortId: "led",
                    }))
                )
            } else {
                // TODO unmout role manger
            }
        })

        // we're about to send the status of the register
        this.color.on(REGISTER_PRE_GET, () => {
            // read rgb data
            const rgbs: number[][] = this.roleManager.roles.map(
                b =>
                    b.service?.register(LedReg.Color)?.unpackedValue || [
                        0, 0, 0,
                    ]
            )
            // do something with the data?
            const [r, g, b] = rgbs.map((rgb, i) => rgb[i])
            this.color.setValues([r, g, b])
        })
    }
}

suite("bus", () => {
    let bus: JDBus
    afterEach(() => bus?.stop())

    test("self announce", function (done) {
        bus = mkBus()
        bus.on(SELF_ANNOUNCE, () => {
            done()
            bus.stop()
        })
    })
})
