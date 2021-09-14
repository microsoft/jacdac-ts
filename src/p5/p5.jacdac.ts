import {
    CONNECTION_STATE,
    DEVICE_ANNOUNCE,
    REPORT_UPDATE,
} from "../jdom/constants"
import { JDDevice } from "../jdom/device"
import { isSensor, serviceSpecifications } from "../jdom/spec"
import { createAnyUSBBus } from "../jdom/transport/webserial"
import { toMap } from "../jdom/utils"

// p5 registration
// https://github.com/processing/p5.js/blob/main/contributor_docs/creating_libraries.md#use-registermethod-to-register-functions-with-p5-that-should-be-called-at-various-times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let p5: any

const sensorSpecs = serviceSpecifications().filter(
    srv => !srv.shortName.startsWith("_") && isSensor(srv)
)

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
export async function connect() {
    await bus.disconnect()
    await bus.connect()
}

/**
 * Disconnects the bus from any connected device
 */
export async function disconnect() {
    await bus.disconnect()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connectBtn: any
/**
 * Creates a Jacdac "connect" button that dissapears when connected.
 * @returns
 */
export function createConnectButton() {
    if (!connectBtn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createButton = (window as any).createButton
        connectBtn = createButton("Jacdac connect")
        connectBtn.position(4, 4)
        connectBtn.mousePressed(connect)
        bus.on(CONNECTION_STATE, () =>
            bus.connected ? connectBtn.hide() : connectBtn.show()
        )
        if (bus.connected) connectBtn.hide()
    }
    return connectBtn
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
                bus.services({ serviceClass: srv.classIdentifier }).map(srv => {
                    const reg = srv.readingRegister
                    const spec = reg.specification
                    const n = spec.fields.length
                    const values = reg.unpackedValue || Array(n).fill(0)
                    return spec.fields.length === 1 ? values[0] : values
                })
        )
    )
}
updateSensors()

// always show connect button if needed
p5.prototype.registerMethod("pre", createConnectButton)
// update sensors state before every render
p5.prototype.registerMethod("pre", updateSensors)
// try connecting to known device when loading
p5.prototype.registerMethod("init", () => bus.connect(true))
