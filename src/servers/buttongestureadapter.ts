import {
    ButtonEvent,
    ButtonReg,
    CHANGE,
    REFRESH,
    SRV_BUTTON,
    SRV_BUTTON_GESTURE,
} from "../jdom/constants"
import SensorServer from "./sensorserver"
import RoleManager from "./rolemanager"
import RegisterServer from "../jdom/registerserver"
import { jdpack } from "../jdom/pack"

const HOLD_TIME = 500
const INACTIVE_VALUE = 0
const ACTIVE_VALUE = 1

export default class ButtonGestureAdapter extends SensorServer<[number]> {
    private roleManager: RoleManager
    
    private _downTime: number
    private _nextHold: number

    constructor(instanceName?: string) {
        super(SRV_BUTTON_GESTURE, {
            instanceName
        })

        this.emit(DEVICE_CHANGE, () => {
            if (this.device) {
                this.roleManager = new RoleManager(this.device.bus)
                this.roleManager.setRoles([ { role: instanceName, serviceShortId: "buttonGesture" } ])
            }
        })


        
    }

    private async handleRefresh() {
        const now = this.device.bus.timestamp
    }

}
