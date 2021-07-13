import {
    ButtonEdgeEvent,
    ButtonEvent,
    ButtonGestureEvent,
    EVENT,
    REPORT_RECEIVE,
    SRV_BUTTON,
    SRV_BUTTON_EDGE,
    SRV_BUTTON_GESTURE,
    SRV_BUTTON_STREAMING,
    SystemReg,
} from "../jdom/constants"
import { assert, JDEvent, Packet } from "../jdom/jacdac-jdom"
import RoleManager from "./rolemanager"
import JDServiceServer from "../jdom/serviceserver"

export class AdapterServer extends JDServiceServer {
    private roleManager: RoleManager = undefined

    // This is a nasty hack that allows the role manager to be set after the server is instantiated.
    // The right solution would be to have this listen for role broadcasts for something
    // but that's not a now feature.
    // TODO de-jankify
    public _hack_setRoleManager(roleManager: RoleManager) {
        assert(this.roleManager === undefined, "resetting role manager")

        this.roleManager = roleManager
        this.onRoleManager(roleManager)
    }

    // to be overloaded - code to run once a role manager is available
    protected onRoleManager(roleManager: RoleManager) {}
}

// Edge detection (up, down) on top of the basic state-streaming button
export class ButtonEdgeAdapter extends AdapterServer {
    protected lastState: "none" | "up" | "down" = "none"

    protected readonly buttonRole: string

    constructor(
        buttonRole: string,
        instanceName?: string,
    ) {
        super(SRV_BUTTON_EDGE, {
            instanceName,
        })

        this.buttonRole = buttonRole
    }

    protected onRoleManager(roleManager: RoleManager) {
        const service = roleManager.getService(this.buttonRole)
        assert(service !== undefined, `no consumed service ${this.buttonRole}`)
        assert(service.serviceClass == SRV_BUTTON_STREAMING) // TODO can this logic be moved into infrastructure?

        service.register(SystemReg.Reading).on(REPORT_RECEIVE, (packet: Packet) => {
            if (this.lastState == "none") {  // first sample sets the initial state
                if (!packet.data[0]) {
                    this.lastState = "up"
                } else {
                    this.lastState = "down"
                }
            } else if (this.lastState == "up" && !!packet.data[0]) {
                this.sendEvent(ButtonEdgeEvent.Down)
                this.lastState = "down"
            } else if (this.lastState == "down" && !packet.data[0]) {
                this.sendEvent(ButtonEdgeEvent.Up)
                this.lastState = "up"
            }
        })
    }
}

// Gesture detection (click, click-and-hold, double-click, ...) on top of ButtonEdge
export class ButtonGestureAdapter extends AdapterServer {
    protected state: "up" | "down_click" | "up_click" | "down_held" = "up"

    // TODO this is only used to gate timeouts using threading + wait.
    // A better solution would be to terminate threads so they don't fire when they're obsoleted.
    // TODO if keeping this architecture, perhaps this needs to be more specific, eg clickTimeoutCounter
    protected eventCounter = 0

    // counter to detect double-clicks and the like
    // reset upon a event being generated
    protected clickCounter = 0

    protected readonly buttonRole: string

    constructor(
        buttonRole: string,
        instanceName?: string,
        protected clickTimeoutMs = 200,
        protected multiClickTimeoutMs = 200
    ) {
        super(SRV_BUTTON_GESTURE, {
            instanceName,
        })

        this.buttonRole = buttonRole
    }

    protected onRoleManager(roleManager: RoleManager) {
        const service = roleManager.getService(this.buttonRole)
        assert(service !== undefined, `no consumed service ${this.buttonRole}`)
        assert(service.serviceClass == SRV_BUTTON_EDGE) // TODO can this logic be moved into infrastructure?

        service.on(EVENT, (ev: JDEvent) => {
            const now = this.device.bus.timestamp
            if (ev.code == ButtonEdgeEvent.Down) {
                this.onSourceButtonDown()
            } else if (ev.code == ButtonEdgeEvent.Up) {
                this.onSourceButtonUp()
            }
        })
    }

    private onSourceButtonDown() {
        this.eventCounter += 1
        const thisEventCount = this.eventCounter
        this.state = "down_click"

        this.device.bus.scheduler.setTimeout(() => {
            if (this.eventCounter == thisEventCount) {
                if (this.clickCounter == 0) {
                    this.sendEvent(ButtonGestureEvent.ClickHold)
                } else {
                    this.sendEvent(ButtonGestureEvent.MultiClickHold)
                    // TODO pack number of clicks
                }

                this.state = "down_held"
            }
        }, this.clickTimeoutMs)
    }

    private onSourceButtonUp() {
        if (this.state == "down_click") {
            this.eventCounter += 1
            const thisEventCount = this.eventCounter
            this.clickCounter += 1
            this.state = "up_click"

            if (this.clickCounter == 1) {
                this.sendEvent(ButtonGestureEvent.Click)
            } else if (this.clickCounter == 2) {
                this.sendEvent(ButtonGestureEvent.DoubleClick)
            } else {
                this.sendEvent(ButtonGestureEvent.MultiClick)
                // TODO pack number of clicks
            }

            this.device.bus.scheduler.setTimeout(() => {
                if (this.eventCounter == thisEventCount) {
                    this.state = "up"
                    this.clickCounter = 0
                }
            }, this.multiClickTimeoutMs)
        } else if (this.state == "down_held") {
            this.sendEvent(ButtonGestureEvent.HoldRelease)

            this.state = "up"
            this.clickCounter = 0
        }
    }
}

// Adapts a legacy button to a ButtonEdge
export class LegacyButtonEdgeAdapter extends AdapterServer {
    protected readonly buttonRole: string

    constructor(
        buttonRole: string,
        instanceName?: string,
    ) {
        super(SRV_BUTTON_EDGE, {
            instanceName,
        })

        this.buttonRole = buttonRole
    }

    protected onRoleManager(roleManager: RoleManager) {
        const service = roleManager.getService(this.buttonRole)
        assert(service !== undefined, `no consumed service ${this.buttonRole}`)
        assert(service.serviceClass == SRV_BUTTON) // TODO can this logic be moved into infrastructure?

        service.on(EVENT, (ev: JDEvent) => {
            const now = this.device.bus.timestamp
            if (ev.code == ButtonEvent.Down) {
                this.sendEvent(ButtonEdgeEvent.Down)
            } else if (ev.code == ButtonEvent.Up) {
                this.sendEvent(ButtonEdgeEvent.Up)
            }
        })
    }
}
