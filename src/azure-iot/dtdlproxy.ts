import { deviceClassToDTDL } from "./dtdlspec"
import { DTDLInterface } from "./dtdl"
import JDBus from "../jdom/bus"
import JDClient from "../jdom/client"
import { CHANGE, DEVICE_CHANGE } from "../jdom/constants"
import { isInfrastructure } from "../jdom/spec"
import JDService from "../jdom/service"

/**
 * Tracks the devices on the bus and automatically generate DTDL information
 */
export default class DTDLProxy extends JDClient {
    constructor(readonly bus: JDBus) {
        super()

        this.bus.on(DEVICE_CHANGE, this.updateDTDL.bind(this))
    }

    private dtdl: DTDLInterface

    private updateDTDL() {
        const newServices = this.bus
            .services({ specification: true, ignoreSelf: true })
            .filter(srv => !isInfrastructure(srv.specification))
        const device: jdspec.DeviceClassSpec = {
            name: "Azure IoT Jacdac Device",
            services: newServices.map(srv => srv.serviceClass),
        }
        const newDTDL = deviceClassToDTDL(device)
        if (JSON.stringify(newDTDL) !== JSON.stringify(this.dtdl)) {
            this.dtdl = newDTDL
            console.log(`new DTDL`, { newDTDL })
            this.emit(CHANGE)
        }
    }
}
