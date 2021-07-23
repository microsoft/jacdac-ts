import { createUSBBus, DeviceFilter, JDBus, JDDevice, JDService, ServiceFilter } from "../jdom/jacdac-jdom"

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
        ui.log("disconnecting ...")
        await bus.disconnect();
        ui.log("connecting ...")
        await bus.connect();
        ui.log("connected")

        tester.devices().forEach(deviceTester => {
            const deviceServiceNames = deviceTester.services().map(service =>
                service.service.specification?.name
            )
            ui.log(`${deviceTester.device.shortId}: ${deviceServiceNames.join(",")}`)
        })
    }

    document.getElementById("disconnect").onclick = async () => {
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
}

class DeviceTester {
    constructor(readonly device: JDDevice) {

    }

    public services(options?: ServiceFilter) {
        return this.device.services(options).map(service => new ServiceTester(service))
    }
}

class ServiceTester {
    constructor(readonly service: JDService) {

    }
}
