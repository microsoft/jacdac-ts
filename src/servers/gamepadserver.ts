import {
    GamepadButtons,
    GamepadEvent,
    GamepadReg,
    GamepadVariant,
    SRV_GAMEPAD,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { SensorServer } from "./sensorserver"

/**
 * @internal
 */
export const GAMEPAD_DPAD_BUTTONS =
    GamepadButtons.Left |
    GamepadButtons.Right |
    GamepadButtons.Up |
    GamepadButtons.Down

/**
 * @internal
 */
export const GAMEPAD_ARCADE_BUTTONS =
    GAMEPAD_DPAD_BUTTONS |
    GamepadButtons.A |
    GamepadButtons.B |
    GamepadButtons.Menu |
    GamepadButtons.Select |
    GamepadButtons.Exit

/**
 * @internal
 */
export const GAMEPAD_DPAD_A_BUTTONS = GAMEPAD_DPAD_BUTTONS | GamepadButtons.A

/**
 * @internal
 */
export const GAMEPAD_DPAD_AB_BUTTONS = GAMEPAD_DPAD_A_BUTTONS | GamepadButtons.B

/**
 * @internal
 */
export const GAMEPAD_DPAD_XY_BUTTONS =
    GAMEPAD_DPAD_BUTTONS | GamepadButtons.X | GamepadButtons.Y

/**
 * @internal
 */
export const GAMEPAD_GAMEPAD_EXTRA_BUTTONS =
    GamepadButtons.B |
    GamepadButtons.Select |
    GamepadButtons.Menu |
    GamepadButtons.Reset

// https://w3c.github.io/gamepad/#remapping
const standardGamepadMapping = [
    [GamepadButtons.Left, 14],
    [GamepadButtons.Right, 15],
    [GamepadButtons.Up, 12],
    [GamepadButtons.Down, 13],
    [GamepadButtons.A, 0],
    [GamepadButtons.B, 1],
    [GamepadButtons.X, 2],
    [GamepadButtons.Y, 3],
    [GamepadButtons.Select, 8],
    [GamepadButtons.Menu, 9],
]

export class GamepadServer extends SensorServer<
    [GamepadButtons, number, number]
> {
    readonly variant: JDRegisterServer<[GamepadVariant]>
    readonly buttonsAvailable: JDRegisterServer<[0 | GamepadButtons]>

    constructor(options?: {
        instanceName?: string
        variant?: GamepadVariant
        buttonsAvailable?: GamepadButtons
    }) {
        super(SRV_GAMEPAD, {
            instanceName: options?.instanceName,
            readingValues: [<GamepadButtons>0, 0, 0],
            streamingInterval: 50,
        })
        const {
            variant = GamepadVariant.Thumb,
            buttonsAvailable = <GamepadButtons>0,
        } = options || {}

        this.variant = this.addRegister<[GamepadVariant]>(GamepadReg.Variant, [
            variant,
        ])
        this.buttonsAvailable = this.addRegister<[GamepadButtons]>(
            GamepadReg.ButtonsAvailable,
            [buttonsAvailable],
        )
    }

    get isAnalog() {
        const [value] = this.buttonsAvailable.values()
        return !(value & GAMEPAD_DPAD_BUTTONS)
    }

    async down(buttons: GamepadButtons) {
        const [currentButtons, x, y] = this.reading.values()
        const newButtons = currentButtons | buttons
        await this.updateReading(newButtons, x, y)
    }

    async up(buttons: GamepadButtons) {
        const [currentButtons, x, y] = this.reading.values()
        const newButtons = currentButtons & ~buttons
        await this.updateReading(newButtons, x, y)
    }

    async updateDirection(x: number, y: number) {
        const [button] = this.reading.values()
        await this.updateReading(button, x, y)
    }

    /**
     * Read the state of a browser gamepad and apply it to the sensor
     * @param gamepad
     */
    async update(gamepad: Gamepad) {
        const { buttons, axes } = gamepad
        const [buttonsAvailable] = this.buttonsAvailable.values()

        let newButtons: GamepadButtons = <GamepadButtons>0
        for (const [b, id] of standardGamepadMapping) {
            if ((b & buttonsAvailable) == b && !!buttons[id].pressed) {
                newButtons |= b
            }
        }

        let newX = 0,
            newY = 0
        if (this.isAnalog) {
            const [axeLeftRight, axeUpDown] = axes
            newX = axeLeftRight
            newY = axeUpDown
        }

        await this.updateReading(newButtons, newX, newY)
    }

    private async updateReading(buttons: GamepadButtons, x: number, y: number) {
        const [oldButtons] = this.reading.values()
        let newButtons = buttons
        if (!this.isAnalog) {
            x =
                buttons & GamepadButtons.Left
                    ? -1
                    : buttons & GamepadButtons.Right
                    ? 1
                    : 0
            y =
                buttons & GamepadButtons.Up
                    ? -1
                    : buttons & GamepadButtons.Down
                    ? 1
                    : 0
        } else {
            const threshold = 0.4
            // clear events
            const mask = ~GAMEPAD_DPAD_BUTTONS
            newButtons = buttons & mask
            // recompute
            if (x < -threshold) newButtons |= GamepadButtons.Left
            else if (x > threshold) newButtons |= GamepadButtons.Right
            if (y < -threshold) newButtons |= GamepadButtons.Up
            else if (y > threshold) newButtons |= GamepadButtons.Down
        }
        this.reading.setValues([newButtons, x, y])
        if (newButtons !== oldButtons) {
            await this.sendEvent(
                GamepadEvent.ButtonsChanged,
                jdpack<[number]>("u32", [newButtons]),
            )
        }
    }
}
