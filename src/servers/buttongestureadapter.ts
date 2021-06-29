import {
    ButtonEvent,
    ButtonGestureEvent,
    EVENT,
    SRV_BUTTON_GESTURE,
} from "../jdom/constants"
import SensorServer from "./sensorserver"
import { JDEvent, JDService } from "../jdom/jacdac-jdom"

export default class ButtonGestureAdapter extends SensorServer<[number]> {
    constructor(button: JDService, instanceName?: string) {
        // TODO should this take not a service so it can be instantiated before a button is announced on the bus?
        // (to avoid the async boilerplate nightmare)
        super(SRV_BUTTON_GESTURE, {
            instanceName,
        })

        button.on(EVENT, (evs: JDEvent[]) => {
            evs.forEach((ev) => {
                if (ev.code == ButtonEvent.Down) {
                    this.sendEvent(
                        ButtonGestureEvent.ClickHold
                    )
                } else if (ev.code == ButtonEvent.Up) {
                    this.sendEvent(
                        ButtonGestureEvent.HoldRelease
                    )
                }
            })
        })
        
    }
}
