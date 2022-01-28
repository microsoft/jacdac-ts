import { startDevTools } from "../jdom/bridges/iframebridge"
import { CONNECTION_STATE, EVENT } from "../jdom/constants"
import { JDEvent } from "../jdom/event"
import { sensorSpecifications, snapshotSensors } from "../jdom/sensors"
import { isEvent } from "../jdom/spec"
import {
    createWebBus,
    isWebTransportSupported,
} from "../jdom/transport/createbus"
import { toMap } from "../jdom/utils"

// p5 registration
// https://github.com/processing/p5.js/blob/main/contributor_docs/creating_libraries.md#use-registermethod-to-register-functions-with-p5-that-should-be-called-at-various-times
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let p5: any

/**
 * The Jacdac bus
 */
export const bus = createWebBus({
    disableRoleManager: true
})
bus.streaming = true

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
 * @returns a button element
 */
export function createConnectButton() {
    if (!connectBtn && isWebTransportSupported()) {
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
 * Call this function in `setup` to show a debug button to enter split mode.
 */
export function debug() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createButton = (window as any).createButton
    const debugBtn = createButton("debug")
    debugBtn.position(116, 4)
    debugBtn.mousePressed(startDevTools)
}

/**
 * An snapshot of the all sensor values observed by Jacdac
 * @category p5js
 */
export const sensors: Record<string, number[] | Record<string, number>[]> = {}
function updateSensors() {
    Object.assign(sensors, snapshotSensors(bus))
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
    sensorSpecifications(),
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
