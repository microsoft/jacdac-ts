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
        // press and release button, within 500ms

        // check down event
        // checks registers until up event
        // check register at end
    }

    public testHold() {
        // press and hold the button

        // checks down event
        // checks registers until up event
        // checks hold event generated, regularly
        // check up event
        // check register at end
    }
}

class PotTestRoutine {
    public testLow() {
        // set the pot to its lowest state, providing a live readout

        // check jitter for a second or so
        // perhaps report on jitter?
    }

    public testHigh() {
        // set the pot to its highest state, providing a live readout

        // check jitter for a second or so
        // perhaps report on jitter?
    }

    public testMid() {
        // set the pot to its mid state, providing a live readout

        // wait for it to stabilize at some point
        // check jitter for a second or so
        // perhaps report on jitter?
    }
}

class PixelRingTestRoutine {
    public testAllRed() {
        // dynamically determine pixel length
        // sets the entire ring red

        // ask user if ring is red
    }

    public testAllGreen() {
        // dynamically determine pixel length
        // sets the entire ring green

        // ask user if ring is green
    }

    public testAllBlue() {
        // dynamically determine pixel length
        // sets the entire ring blue

        // ask user if ring is blue
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
