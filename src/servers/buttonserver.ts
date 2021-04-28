import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants"
import SensorServer from "./sensorserver"
import RegisterServer from "../jdom/registerserver"

const HOLD_TIME = 500
const INACTIVE_VALUE = 0
const ACTIVE_VALUE = 1

export default class ButtonServer extends SensorServer<[number]> {
    private _downTime: number
    private _nextHold: number

    public threshold: RegisterServer<[number]>

    constructor(instanceName?: string) {
        super(SRV_BUTTON, {
            instanceName,
            readingValues: [INACTIVE_VALUE],
            streamingInterval: 50,
        })
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    get isAnalog() {
        return !!this.threshold
    }

    private isActive() {
        // TODO: debouncing
        const [v] = this.reading.values()
        const t = this.threshold?.values()?.[0] || 0xff / 0xffff

        return v > t
    }

    private async handleRefresh() {
        if (this.isActive()) {
            // down event
            if (this._downTime === undefined) {
                this._downTime = this.device.bus.timestamp
                this._nextHold = this._downTime + HOLD_TIME
                await this.sendEvent(ButtonEvent.Down)
                // hold
            } else if (this.device.bus.timestamp > this._nextHold) {
                this._nextHold = this.device.bus.timestamp + HOLD_TIME
                await this.sendEvent(ButtonEvent.Hold)
            }
        } else {
            // up event
            if (this._downTime !== undefined) {
                this._downTime = undefined
                this._nextHold = undefined
                await this.sendEvent(ButtonEvent.Up)
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
