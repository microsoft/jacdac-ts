import { createUSBBus, DeviceFilter, DEVICE_ANNOUNCE, JDBus, JDDevice, JDService, ServiceFilter } from "../jdom/jacdac-jdom"

class ConsoleUi {
    readonly logDiv: HTMLElement
    constructor(protected readonly document: Document) {
        this.logDiv = document.getElementById("log")

    }

    public log(msg: string) {  // TS reimplementation of console from packets.html
        const line = this.document.createElement("div")
        line.innerText = "" + msg
        line.style.whiteSpace = "pre-wrap"
        this.logDiv.appendChild(line)
        while (this.logDiv.childElementCount > 100) {
            this.logDiv.firstChild.remove()
        }
    }
}

export function main(document: Document) {
    const bus = createUSBBus()
    const tester = new BusTester(bus)
    const ui = new ConsoleUi(document)

    document.getElementById("connect").onclick = async () => {
        ui.log("")
        ui.log("disconnecting ...")
        await bus.disconnect();
        ui.log("connecting ...")
        await bus.connect();
        ui.log("connected")

        ui.log("devices:")
        tester.devices().forEach(deviceTester => {
            const deviceServiceNames = deviceTester.services().map(service =>
                service.service.specification?.name
            )
            ui.log(`- ${deviceTester.device.shortId}: ${deviceServiceNames.join(",")}`)
        })

        const device = await tester.nextConnected()
        ui.log(`connected: ${device.name()}`)
    }

    document.getElementById("disconnect").onclick = async () => {
        ui.log("")
        ui.log("disconnecting ...")
        await bus.disconnect()
        ui.log("disconnected")
    }
}

class BusTester {
    constructor(readonly bus: JDBus) {
    }

    public devices(options?: DeviceFilter) {
        return this.bus.devices(options).map(device => new DeviceTester(device))
    }

    public async nextConnected(): Promise<DeviceTester> {
        const promise = new Promise<DeviceTester>(resolve => {
            this.bus.once(DEVICE_ANNOUNCE, (device: JDDevice) => {
                resolve(new DeviceTester(device))
            })
        })
        
        return promise
    }
}

class DeviceTester {
    constructor(readonly device: JDDevice) {

    }

    public name() {
        return this.device.shortId
    }

    public services(options?: ServiceFilter) {
        return this.device.services(options).map(service => new ServiceTester(service))
    }
}

class ServiceTester {
    constructor(readonly service: JDService) {

    }

    public name() {
        return this.service.specification.name
    }
}

// TODO separate out some kind of human (tester) interface class? which can have different implementations,
// eg web button or physical Jacdac module button?

class ButtonTestRoutine {
    public testClick() {
        // User instruction: press and release button, within 500ms

        // check synchronous event: down event, register up-to-down, within some tolerance (100ms?)
            // test case errors if these are out of sync - with a special message
        // wait at most 500ms - until next - assert register remains down, assert no events
        // check synchronous event: up event, register down-to-up, within some tolerance (100ms?)

        // concepts
        // assert synchronous events
        // wait until event, with timing bounds and duration assertions (no events fire, register within / equal)
    }

    public testHold() {
        // User instruction: press and hold the button

        // check synchronous event: down event, register up-to-down, within some tolerance (100ms?)
        // wait 500ms +/- 100 ms - until next - assert register remains down, assert no events
        // check event: hold generated - initial hold test
        // repeat 2-3 times - subsequent hold tests
    
        // User instruction: release button (to reset state for next test)

        // check synchronous event: up event, register down-to-up, within some tolerance (100ms?)
    }
}

class PotTestRoutine {
    public testLow() {
        // User instruction: set the pot to its lowest state, providing a live readout

        // wait for register to be about zero (some tolerance), stable for about a second
        // (optional) record for 1s, report on jitter and average

        // concepts
        // ask user a question - y/n might be fine
        // wait for some stability condition - with feedback to the user
        // assert some stability condition (duration assertions)
        // wait, while collecting some data (jitter, in this case)
    }

    public testHigh() {
        // same as low case, but high
    }

    public testMid() {
        // same as low case, but mid, perhaps with some mechanism so the user 
    }
}

class EncoderTestRoutine {
    // ideally with a nanoservices approach the button would re-use the button tests

    public testIncrement() {
        // duration assertion: register does not decrement

        // User instruction: turn clockwise one click

        // wait for register to increment

        // User instruction: turn clockwise for one full turn

        // wait for register to equal one full turn
        // make sure it doesn't overshoot
        // TODO how to make this recoverable if the user turns it too quickly?
        // ideas: release duration assertion after hitting a full turn
        //   but wait for value to stabilize

        // concepts
        // duration assertions
        // wait for some stability conditions
    }

    public testDecrement() {
        // inverted of decrement test
    }
}

class PixelRingTestRoutine {
    public testRgb() {
        // dynamically determine pixel length

        // sets the entire ring red
        // ask user if ring is red

        // repeat for green, blue
    }

    public testAllWhite() {
        // sets everything full blast

        // ask user if it's correct
    }

    public testFade() {
        // runs through a fade R-Y-G-C-B-P sequence
    }

    public testRotate() {
        // rotates LEDs with a R-Y-G-C-B-P sequence
    }
}
