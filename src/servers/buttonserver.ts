import { ButtonEvent, REFRESH, SRV_BUTTON } from "../jdom/constants"
import SensorServer from "./sensorserver"
import RegisterServer from "../jdom/registerserver"

const HOLD_TIME = 500

export default class ButtonServer extends SensorServer<[number]> {
    private _downTime: number
    private _nextHold: number

    public threshold: RegisterServer<[number]>

    constructor(instanceName?: string) {
        super(SRV_BUTTON, {
            instanceName,
            readingValues: [0],
            streamingInterval: 50,
        })
        this.on(REFRESH, this.handleRefresh.bind(this))
    }

    get isAnalog() {
        return !!this.threshold
    }

    private isActive() {
        const [v] = this.reading.values()
        const t = this.threshold?.values()?.[0] || 0xff
        return v > t
    }

    private async handleRefresh() {
        if (this.isActive()) {
            if (this.device.bus.timestamp > this._nextHold) {
                this._nextHold = this.device.bus.timestamp + HOLD_TIME
                await this.sendEvent(ButtonEvent.Hold)
            }
        }
    }

    async down() {
        if (this.isActive()) return

        this._downTime = this.device.bus.timestamp
        this._nextHold = this._downTime + HOLD_TIME
        this.reading.setValues([0xffff])
        await this.sendEvent(ButtonEvent.Down)
    }

    async up() {
        if (!this.isActive()) return

        this.reading.setValues([0])
        await this.sendEvent(ButtonEvent.Up)
    }
}
