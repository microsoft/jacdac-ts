import { DEVICE_ANNOUNCE, REPORT_UPDATE } from "../jdom/constants"
import { JDDevice } from "../jdom/device"
import { isSensor, serviceSpecifications } from "../jdom/spec"
import { createAnyUSBBus } from "../jdom/transport/webserial"
import { toMap } from "../jdom/utils"

// p5 registration
// https://github.com/processing/p5.js/blob/main/contributor_docs/creating_libraries.md#use-registermethod-to-register-functions-with-p5-that-should-be-called-at-various-times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let p5: any

const sensorSpecs = serviceSpecifications().filter(isSensor)

/**
 * The Jacdac bus
 */
export const bus = createAnyUSBBus()

// ensure that the bus queries those services
bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) =>
    dev.services().map(srv => srv.readingRegister?.on(REPORT_UPDATE, () => {}))
)

/**
 * Tries to connect to a jacdac device. Must be called from a button handler
 */
export function connect() {
    bus.connect()
}

/**
 * Disconnects the bus from any connected device
 */
export function disconnect() {
    bus.disconnect()
}

/**
 * An object with all sensor values recorded by Jacdac
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sensors: any = {}

function updateSensors() {
    Object.assign(
        sensors,
        toMap(
            sensorSpecs,
            srv => srv.camelName,
            srv =>
                bus
                    .services({ serviceClass: srv.classIdentifier })
                    .map(srv => srv.readingRegister.unpackedValue)
                    .map(values => (values.length === 1 ? values[0] : values))
        )
    )
}
updateSensors()

// update sensors state before every render
p5.prototype.registerMethod("pre", updateSensors)
