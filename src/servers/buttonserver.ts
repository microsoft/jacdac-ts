import {
    ButtonEvent,
    ButtonReg,
    CHANGE,
    REFRESH,
    SRV_BUTTON,
} from "../jdom/constants"
import { SensorServer } from "./sensorserver"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { jdpack } from "../jdom/pack"

/**
 * Server implementation for the button service
 * @category Servers
 */
export class ButtonServer extends SensorServer<[number]> {
    public static readonly HOLD_TIME = 500
    public static readonly INACTIVE_VALUE = 0
    public static readonly ACTIVE_VALUE = 1

    private _downTime: number
    private _nextHold: number

    readonly analog: JDRegisterServer<[boolean]>
    private _threshold: JDRegisterServer<[number]>

    constructor(instanceName?: string, analog?: boolean) {
        super(SRV_BUTTON, {
            instanceName,
            readingValues: [ButtonServer.INACTIVE_VALUE],
            streamingInterval: 50,
        })
        this.analog = this.addRegister(ButtonReg.Analog, [!!analog])
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    get threshold() {
        return this._threshold
    }

    set threshold(value: JDRegisterServer<[number]>) {
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
                this._nextHold = this._downTime + ButtonServer.HOLD_TIME
                await this.sendEvent(ButtonEvent.Down)
                // hold
            } else if (now > this._nextHold) {
                const time = now - this._downTime
                this._nextHold =
                    this.device.bus.timestamp + ButtonServer.HOLD_TIME
                await this.sendEvent(
                    ButtonEvent.Hold,
                    jdpack<[number]>("u32", [time]),
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
                    jdpack<[number]>("u32", [time]),
                )
            }
        }
    }

    async down() {
        this.reading.setValues([ButtonServer.ACTIVE_VALUE])
    }

    async up() {
        this.reading.setValues([ButtonServer.INACTIVE_VALUE])
    }
}
