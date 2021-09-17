import {
    CONNECTION_STATE,
    DEVICE_ANNOUNCE,
    EVENT,
    REPORT_UPDATE,
} from "../jdom/constants"
import { JDDevice } from "../jdom/device"
import JDEvent from "../jdom/event"
import { isEvent, isSensor, serviceSpecifications } from "../jdom/spec"
import { createWebBus } from "../jdom/transport/createbus"
import { toMap } from "../jdom/utils"

// p5 registration
// https://github.com/processing/p5.js/blob/main/contributor_docs/creating_libraries.md#use-registermethod-to-register-functions-with-p5-that-should-be-called-at-various-times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let p5: any

const serviceSpecs = serviceSpecifications().filter(
    srv => !srv.shortName.startsWith("_") && isSensor(srv)
)
const sensorSpecs = serviceSpecs.filter(srv => isSensor(srv))

/**
 * The Jacdac bus
 */
export const bus = createWebBus()

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
 * An snapshot of the all sensor values observed by Jacdac
 * @category p5js
 */
export const sensors: Record<string, number[] | Record<string, number>[]> = {}
function updateSensors() {
    Object.assign(
        sensors,
        toMap(
            sensorSpecs,
            srv => srv.camelName,
            srv =>
                bus
                    .services({
                        serviceClass: srv.classIdentifier,
                        ignoreSelf: true,
                        announced: true,
                    })
                    .map(srv => {
                        const reg = srv.readingRegister
                        const spec = reg.specification
                        return spec.fields.length === 1
                            ? reg.unpackedValue?.[0] || 0
                            : reg.objectValue || {}
                    })
        )
    )
}
updateSensors()

/**
 * Registration for each available event in Jacdac
 * @category p5js
 */
export const events: Record<
    string,
    Record<string, (handler: (event: JDEvent) => void) => void>
> = toMap(
    serviceSpecs,
    spec => spec.camelName,
    spec =>
        toMap(
            spec.packets.filter(pkt => isEvent(pkt)),
            pkt => pkt.name,
            pkt => (handler: (event: JDEvent) => void) =>
                bus.on(EVENT, (ev: JDEvent) => {
                    if (
                        ev.service.serviceClass === spec.classIdentifier &&
                        ev.code === pkt.identifier
                    )
                        handler(ev)
                })
        )
)

// always show connect button if needed
p5.prototype.registerMethod("pre", createConnectButton)
// update sensors state before every render
p5.prototype.registerMethod("pre", updateSensors)
// try connecting to known device when loading
p5.prototype.registerMethod("init", () => bus.connect(true))
