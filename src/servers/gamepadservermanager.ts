import { JDBus } from "../jdom/bus"
import { JDClient } from "../jdom/client"
import { GamepadVariant } from "../jdom/constants"
import { JDServerServiceProvider } from "../jdom/servers/serverserviceprovider"
import { GamepadServer, GAMEPAD_ARCADE_BUTTONS } from "./gamepadserver"

export class GamepadHostManager extends JDClient {
    private providers: {
        deviceProvider: JDServerServiceProvider
        service: GamepadServer
        timestamp: number
    }[] = []
    private ticking = false

    static start(bus: JDBus) {
        if (
            typeof window !== "undefined" &&
            window.navigator &&
            window.navigator.getGamepads
        ) {
            return new GamepadHostManager(bus)
        }
        return undefined
    }

    constructor(readonly bus: JDBus) {
        super()
        this.handleGamepadConnected = this.handleGamepadConnected.bind(this)
        this.handleGamepadDisconnected =
            this.handleGamepadDisconnected.bind(this)

        this.mount(this.removeEventListener.bind(this))
        this.addEventListeners()
    }

    private addEventListeners() {
        if (typeof window === "undefined") return

        window.addEventListener(
            "gamepadconnected",
            this.handleGamepadConnected,
            false,
        )
        window.addEventListener(
            "gamepaddisconnected",
            this.handleGamepadDisconnected,
            false,
        )
    }

    private removeEventListener() {
        if (typeof window === "undefined") return

        window.removeEventListener(
            "gamepadconnected",
            this.handleGamepadConnected,
        )
        window.removeEventListener(
            "gamepaddisconnected",
            this.handleGamepadDisconnected,
        )
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleGamepadConnected(event: GamepadEvent) {
        console.debug("gamepad connected")
        if (!this.ticking) this.tick()
    }

    private handleGamepadDisconnected(event: GamepadEvent) {
        console.debug("gamepad disconnected")
        const { gamepad } = event
        const { index } = gamepad
        const provider = this.providers[index]
        if (provider) {
            this.bus.removeServiceProvider(provider.deviceProvider)
            this.providers[index] = undefined
        }
        if (!this.ticking) this.tick()
    }

    private pollGamepads() {
        try {
            const r = navigator.getGamepads()
            return r
        } catch (e) {
            return undefined
        }
    }

    private update() {
        const gamepads = this.pollGamepads()

        const now = this.bus.timestamp
        for (let i = 0; i < gamepads?.length; ++i) {
            const gamepad = gamepads[i]
            if (!gamepad) continue
            // allocated host if needed
            let host = this.providers[i]
            if (!host) {
                const service = new GamepadServer({
                    variant: GamepadVariant.Gamepad,
                    buttonsAvailable: GAMEPAD_ARCADE_BUTTONS,
                })
                const deviceHost = new JDServerServiceProvider("gamepad", [
                    service,
                ])
                this.bus.addServiceProvider(deviceHost)
                this.providers[i] = host = {
                    service,
                    deviceProvider: deviceHost,
                    timestamp: now,
                }
            }
            // update state
            host.timestamp = now
            host.service.update(gamepad)
        }
    }

    private tick() {
        this.ticking = true
        this.update()
        if (this.providers.some(h => h !== undefined))
            window.requestAnimationFrame(() => this.tick())
        else this.ticking = false
    }
}
