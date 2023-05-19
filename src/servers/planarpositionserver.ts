import { SRV_PLANAR_POSITION } from "../jacdac"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDSensorServer } from "./sensorserver"

export class PlanarPositionServer extends JDSensorServer<[number, number]> {
    position: JDRegisterServer<[number]>

    constructor() {
        super(SRV_PLANAR_POSITION, {
            readingValues: [0, 0],
            preferredStreamingInterval: 500,
        })
    }

    move(dx: number, dy: number) {
        let [x = 0, y = 0] = this.reading.values()
        x += dx
        y += dy
        this.reading.setValues([x, y])
        // always send update immediately
        this.reading.sendGetAsync()
    }
}
