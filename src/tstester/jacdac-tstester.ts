// Top-level code / web interface code
import {
    createUSBBus,
    DEVICE_ANNOUNCE,
    JDDevice,
    SRV_BUTTON,
    SRV_LED_PIXEL,
    SRV_POTENTIOMETER,
} from "../jdom/jacdac-jdom"
import { TestDriver, ConsoleUi } from "./base"
import { ButtonTestRoutine } from "./button.spec"
import { LedPixelTestRoutine } from "./ledpixel.spec"
import { PotentiometerTestRoutine } from "./potentiometer.spec"
import { ServiceTester } from "./servicewrapper"
import { BusTester } from "./testwrappers"

export class TestDocUi implements ConsoleUi {
    readonly logDiv: HTMLElement
    constructor(protected readonly document: Document) {
        this.logDiv = document.getElementById("log")
    }

    public log(msg: string) {
        // TS reimplementation of console from packets.html
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
    const ui = new TestDocUi(document)

    const bus = createUSBBus()
    const tester = new BusTester(bus)
    const testdriver = new TestDriver(bus, ui)

    const handler = async (device: JDDevice) => {
        ui.log(`connected: ${device.name}`)

        const buttonServices = device.services({ serviceClass: SRV_BUTTON })
        if (buttonServices.length == 1) {
            const serviceTester = new ServiceTester(buttonServices[0])
            ui.log(`starting button test: ${serviceTester.name}`)
            const buttonTest = new ButtonTestRoutine(serviceTester, testdriver)
            try {
                await buttonTest.testHold()
                await buttonTest.testClick()
            } catch (e: unknown) {
                ui.log(`button test: exception: ${e}`)
                throw e
            }
        }
        const potServices = device.services({ serviceClass: SRV_POTENTIOMETER })
        if (potServices.length == 1) {
            const serviceTester = new ServiceTester(potServices[0])
            ui.log(`starting pot test: ${serviceTester.name}`)
            const potTest = new PotentiometerTestRoutine(
                serviceTester,
                testdriver
            )
            try {
                await potTest.testMax()
                await potTest.testMin()
                await potTest.testSlideUp()
                await potTest.testSlideDown()
            } catch (e: unknown) {
                ui.log(`pot test: exception: ${e}`)
                throw e
            }
        }
        const pixelServices = device.services({ serviceClass: SRV_LED_PIXEL })
        if (pixelServices.length == 1) {
            const serviceTester = new ServiceTester(pixelServices[0])
            ui.log(`starting pixel test: ${serviceTester.name}`)
            const pixelTest = new LedPixelTestRoutine(serviceTester, testdriver)
            try {
                await pixelTest.testSolidColors()
                await pixelTest.testShift()
                await pixelTest.testSetOne()
            } catch (e: unknown) {
                ui.log(`pixel test: exception: ${e}`)
                throw e
            }
        }
    }
    bus.on(DEVICE_ANNOUNCE, handler)

    document.getElementById("connect").onclick = async () => {
        ui.log("")
        ui.log("disconnecting ...")
        await bus.disconnect()
        ui.log("connecting ...")
        await bus.connect()
        ui.log("connected")

        ui.log("devices:")
        tester.devices().forEach(deviceTester => {
            const deviceServiceNames = deviceTester
                .services()
                .map(service => service.name)
            ui.log(
                `- ${deviceTester.device.shortId}: ${deviceServiceNames.join(
                    ","
                )}`
            )
        })
    }

    document.getElementById("disconnect").onclick = async () => {
        ui.log("")
        ui.log("disconnecting ...")
        await bus.disconnect()
        ui.log("disconnected")
    }
}
