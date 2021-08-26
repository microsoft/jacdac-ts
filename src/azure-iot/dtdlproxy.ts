import { deviceClassToDTDL } from "./dtdlspec"
import { DTDLInterface } from "./dtdl"
import JDBus from "../jdom/bus"
import JDClient from "../jdom/client"
import { CHANGE, DEVICE_CHANGE } from "../jdom/constants"
import { isInfrastructure } from "../jdom/spec"

export const DTDL_DEVICE_MODELS_REPOSITORY =
    "https://jacdac-device-models.azurewebsites.net/"

/**
 * Tracks the devices on the bus and automatically generate DTDL information
 * @internal
 */
export default class DTDLProxy extends JDClient {
    private _dtdl: DTDLInterface

    constructor(readonly bus: JDBus) {
        super()

        this.bus.on(DEVICE_CHANGE, this.updateDTDL.bind(this))
        this.updateDTDL()
    }

    get dtdl() {
        return this._dtdl
    }

    private updateDTDL() {
        const newServices = this.bus
            .services({ specification: true, ignoreSelf: true })
            .filter(srv => !isInfrastructure(srv.specification))
            .sort((l, r) => l.compareTo(r))
        const device: jdspec.DeviceClassSpec = {
            name: "Azure IoT Jacdac Device",
            services: newServices.map(srv => srv.serviceClass),
        }
        const newDTDL = deviceClassToDTDL(device)
        if (JSON.stringify(newDTDL) !== JSON.stringify(this._dtdl)) {
            this._dtdl = newDTDL
            console.log(`new DTDL`, { newDTDL })
            this.emit(CHANGE)
        }
    }
}
