import {
    ButtonEvent,
    ButtonReg,
    CHANGE,
    REFRESH,
    SRV_BUTTON,
} from "../jdom/constants"
import SensorServer from "./sensorserver"
import RegisterServer from "../jdom/registerserver"
import { jdpack } from "../jdom/pack"

const HOLD_TIME = 500
const INACTIVE_VALUE = 0
const ACTIVE_VALUE = 1

export default class ButtonServer extends SensorServer<[number]> {
    private _downTime: number
    private _nextHold: number

    readonly analog: RegisterServer<[boolean]>
    private _threshold: RegisterServer<[number]>

    constructor(instanceName?: string, analog?: boolean) {
        super(SRV_BUTTON, {
            instanceName,
            readingValues: [INACTIVE_VALUE],
            streamingInterval: 50,
        })
        this.analog = this.addRegister(ButtonReg.Analog, [!!analog])
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    get threshold() {
        return this._threshold
    }

    set threshold(value: RegisterServer<[number]>) {
        if (value !== this._threshold) {
            this._threshold = value
            this.analog.setValues([!!this._threshold])
            this.emit(CHANGE)
        }
    }

    private isActive() {
        // TODO: debouncing
        const [v] = this.reading.values()
        const t = this.threshold?.values()?.[0] || 0.5

        return v > t
    }

    private async handleRefresh() {
        const now = this.device.bus.timestamp
        if (this.isActive()) {
            // down event
            if (this._downTime === undefined) {
                this._downTime = now
                this._nextHold = this._downTime + HOLD_TIME
                await this.sendEvent(ButtonEvent.Down)
                // hold
            } else if (now > this._nextHold) {
                const time = now - this._downTime
                this._nextHold = this.device.bus.timestamp + HOLD_TIME
                await this.sendEvent(
                    ButtonEvent.Hold,
                    jdpack<[number]>("u32", [time])
                )
            }
        } else {
            // up event
            if (this._downTime !== undefined) {
                const time = now - this._downTime
                this._downTime = undefined
                this._nextHold = undefined
                await this.sendEvent(
                    ButtonEvent.Up,
                    jdpack<[number]>("u32", [time])
                )
            }
        }
    }

    async down() {
        this.reading.setValues([ACTIVE_VALUE])
    }

    async up() {
        this.reading.setValues([INACTIVE_VALUE])
    }
}
