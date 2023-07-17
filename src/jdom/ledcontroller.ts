import { CHANGE, ControlCmdPack } from "./constants"
import { JDEventSource } from "./eventsource"
import { jdpack, jdunpack } from "./pack"
import { Packet } from "./packet"
import { JDService } from "./service"

function trgbToValues(trgb: number) {
    return [
        (trgb >> 16) & 0xff,
        (trgb >> 8) & 0xff,
        trgb & 0xff,
        (trgb >> 24) & 0xff,
    ]
}

export class LEDController extends JDEventSource {
    private _color: number

    constructor(
        public readonly service: JDService,
        public readonly command: number
    ) {
        super()
    }

    get color(): number {
        return this._color
    }

    async setColor(color: number) {
        if (color !== this._color) {
            this._color = color
            if (this._color !== undefined) {
                const data = jdpack(
                    ControlCmdPack.SetStatusLight,
                    trgbToValues(color)
                )
                await this.service.sendCmdAsync(this.command, data)
            }
            this.emit(CHANGE)
        }
    }

    async blink(from: number, to: number, interval: number, repeat: number) {
        const { bus } = this.service.device
        for (let i = 0; i < repeat; ++i) {
            await this.setColor(from)
            await bus.delay(interval - 1)
            await this.setColor(to)
            await bus.delay(interval - 1)
        }
    }

    handlePacket(pkt: Packet) {
        const [toRed, toGreen, toBlue] = jdunpack<
            [number, number, number, number]
        >(pkt.data, ControlCmdPack.SetStatusLight)
        this._color = (toRed << 16) | (toGreen << 8) | toBlue
        this.emit(CHANGE)
    }
}
