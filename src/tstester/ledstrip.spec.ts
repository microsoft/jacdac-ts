import { LedStripCmd, LedStripReg } from "../jdom/constants"
import { TestDriver } from "./base"
import { ServiceTester } from "./servicewrapper"

export class LedStripTestRoutine {
    constructor(
        readonly service: ServiceTester,
        readonly driver: TestDriver,
    ) {}

    public async testSolidColors() {
        // Avoid over-use of "this" everywhere
        const service = this.service.service
        await service.register(LedStripReg.NumPixels).refresh()
        this.driver.log(
            `${service.register(LedStripReg.NumPixels).unpackedValue} pixels`,
        )

        // TODO the LED command constants should be defined somewhere
        // Cycle through R - G - B
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x79, 0x00, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x00, 0x79, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x00, 0x00, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))

        // Cycle through yellow - cyan - purple
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x79, 0x79, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x00, 0x79, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x79, 0x00, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))

        // White
        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x79, 0x79, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    public async testShift() {
        const service = this.service.service

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([
                0xd1, 0xc3, 0x79, 0x00, 0x00, 0x00, 0x79, 0x00, 0x00, 0x00,
                0x79,
            ]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))

        for (let i = 0; i < 8; i++) {
            await service.sendCmdAsync(
                LedStripCmd.Run,
                Uint8Array.from([0xd3, 0x01]),
                true,
            )
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        for (let i = 0; i < 8; i++) {
            await service.sendCmdAsync(
                LedStripCmd.Run,
                Uint8Array.from([0xd4, 0x01]),
                true,
            )
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        this.driver.log("shifting done")
    }

    public async testSetOne() {
        const service = this.service.service

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xd0, 0xc1, 0x00, 0x00, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 500))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x00, 0x79, 0x00, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x01, 0x00, 0x79, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x02, 0x00, 0x00, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x03, 0x79, 0x79, 0x00]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x04, 0x00, 0x79, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x05, 0x79, 0x00, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        await service.sendCmdAsync(
            LedStripCmd.Run,
            Uint8Array.from([0xcf, 0x06, 0x79, 0x79, 0x79]),
            true,
        )
        await new Promise(resolve => setTimeout(resolve, 100))

        this.driver.log("setting done")
    }
}
