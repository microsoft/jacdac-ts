import { JDEventSource } from "./eventsource"
import { jdpack } from "./pack"
import { JDService } from "./service"
import { delay } from "./utils"

function trgbToValues(trgb: number) {
    return [
        (trgb >> 16) & 0xff,
        (trgb >> 8) & 0xff,
        trgb & 0xff,
        (trgb >> 24) & 0xff,
    ]
}

export default class LEDController extends JDEventSource {
    constructor(
        public readonly service: JDService,
        public readonly command: number
    ) {
        super()
    }

    async blink(from: number, to: number, interval: number, repeat: number) {
        const on = jdpack("u8 u8 u8 u8", trgbToValues(from))
        const off = jdpack("u8 u8 u8 u8", trgbToValues(to))
        for (let i = 0; i < repeat; ++i) {
            await this.service.sendCmdAsync(this.command, on)
            await delay(interval - 1)
            await this.service.sendCmdAsync(this.command, off)
            await delay(interval - 1)
        }
    }
}
