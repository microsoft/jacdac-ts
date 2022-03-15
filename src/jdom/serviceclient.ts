import { JDService } from "./service"
import { JDDevice } from "./device"
import { JDBus } from "./bus"
import { JDClient } from "./client"
import { CHANGE, EVENT, SystemEvent, SystemReg, SystemStatusCodes } from "./constants"

/**
 * Base class for service clients
 * @category Clients
 */
export class JDServiceClient extends JDClient {
    constructor(public readonly service: JDService) {
        super()

        const statusCodeChanged = this.service.event(
            SystemEvent.StatusCodeChanged
        )
        this.mount(statusCodeChanged?.subscribe(EVENT, () => this.emit(CHANGE)))
    }

    protected get device(): JDDevice {
        return this.service.device
    }

    protected get bus(): JDBus {
        return this.device.bus
    }

    get statusCode(): SystemStatusCodes {
        const reg = this.service.register(SystemReg.StatusCode)
        return reg.unpackedValue?.[0]
    }

    toString(): string {
        return `client of ${this.service}`
    }
}
