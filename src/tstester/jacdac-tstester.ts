// Top-level code / web interface code
import { createUSBBus, DEVICE_ANNOUNCE, JDDevice, JDService, SRV_BUTTON } from "../jdom/jacdac-jdom"
import { TestDriver } from "./base"
import { ButtonTestRoutine } from "./examples"
import { ServiceTester } from "./servicewrapper"
import { BusTester } from "./testwrappers"

export class ConsoleUi {
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
    const ui = new ConsoleUi(document)

    const bus = createUSBBus()
    const tester = new BusTester(bus)
    const testdriver = new TestDriver(bus, ui)

    const handler = async (device: JDDevice) => {
        tester.devices({})
        const buttonServices = device.services({serviceClass: SRV_BUTTON})
        if (buttonServices.length == 1) {
            const serviceTester = new ServiceTester(buttonServices[0])
            ui.log(`connected (device w/ single button): ${serviceTester.name}`)
            const buttonTest = new ButtonTestRoutine(serviceTester, testdriver)
            try {
                await buttonTest.testHold()
            } catch (e: unknown) {
                ui.log(`exception: ${e}`)
                throw e
            }
        }
    }
    bus.on(DEVICE_ANNOUNCE, handler)        

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
                service.name
            )
            ui.log(`- ${deviceTester.device.shortId}: ${deviceServiceNames.join(",")}`)
        })

        const device = await tester.nextConnected()
        ui.log(`connected: ${device.name}`)        
    }

    document.getElementById("disconnect").onclick = async () => {
        ui.log("")
        ui.log("disconnecting ...")
        await bus.disconnect()
        ui.log("disconnected")
    }
}
