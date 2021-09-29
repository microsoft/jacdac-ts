import {
    JoystickButtons,
    JoystickEvent,
    JoystickReg,
    JoystickVariant,
    SRV_JOYSTICK,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import JDRegisterServer from "../jdom/servers/registerserver"
import SensorServer from "./sensorserver"

/**
 * @internal
 */
export const JOYSTICK_DPAD_BUTTONS =
    JoystickButtons.Left |
    JoystickButtons.Right |
    JoystickButtons.Up |
    JoystickButtons.Down

/**
 * @internal
 */
export const JOYSTICK_ARCADE_BUTTONS =
    JOYSTICK_DPAD_BUTTONS |
    JoystickButtons.A |
    JoystickButtons.B |
    JoystickButtons.Menu |
    JoystickButtons.Select |
    JoystickButtons.Exit

/**
 * @internal
 */
export const JOYSTICK_DPAD_A_BUTTONS = JOYSTICK_DPAD_BUTTONS | JoystickButtons.A

/**
 * @internal
 */
export const JOYSTICK_DPAD_AB_BUTTONS =
    JOYSTICK_DPAD_A_BUTTONS | JoystickButtons.B

/**
 * @internal
 */
export const JOYSTICK_GAMEPAD_EXTRA_BUTTONS =
    JoystickButtons.B |
    JoystickButtons.Select |
    JoystickButtons.Menu |
    JoystickButtons.Reset

// https://w3c.github.io/gamepad/#remapping
const standardGamepadMapping = [
    [JoystickButtons.Left, 14],
    [JoystickButtons.Right, 15],
    [JoystickButtons.Up, 12],
    [JoystickButtons.Down, 13],
    [JoystickButtons.A, 0],
    [JoystickButtons.B, 1],
    [JoystickButtons.Select, 8],
    [JoystickButtons.Menu, 9],
]

export default class JoystickServer extends SensorServer<
    [JoystickButtons, number, number]
> {
    readonly variant: JDRegisterServer<[JoystickVariant]>
    readonly buttonsAvailable: JDRegisterServer<[JoystickButtons]>

    constructor(options?: {
        instanceName?: string
        variant?: JoystickVariant
        buttonsAvailable?: JoystickButtons
    }) {
        super(SRV_JOYSTICK, {
            instanceName: options?.instanceName,
            readingValues: [0, 0, 0],
            streamingInterval: 50,
        })
        const { variant = JoystickVariant.Thumb, buttonsAvailable = 0 } =
            options || {}

        this.variant = this.addRegister<[JoystickVariant]>(
            JoystickReg.Variant,
            [variant]
        )
        this.buttonsAvailable = this.addRegister<[JoystickButtons]>(
            JoystickReg.ButtonsAvailable,
            [buttonsAvailable]
        )
    }

    get isDigital() {
        const [value] = this.buttonsAvailable.values()
        return (value & JOYSTICK_DPAD_BUTTONS) === JOYSTICK_DPAD_BUTTONS
    }

    async down(buttons: JoystickButtons) {
        const [currentButtons, x, y] = this.reading.values()
        const newButtons = currentButtons | buttons
        this.updateDirection(newButtons, x, y)
    }

    async up(buttons: JoystickButtons) {
        const [currentButtons, x, y] = this.reading.values()
        const newButtons = currentButtons & ~buttons
        this.updateDirection(newButtons, x, y)
    }

    updateDirection(buttons: JoystickButtons, x: number, y: number) {
        const [oldButtons] = this.reading.values()
        if (this.isDigital) {
            x =
                buttons & JoystickButtons.Left
                    ? -1
                    : buttons & JoystickButtons.Right
                    ? 1
                    : 0
            y =
                buttons & JoystickButtons.Up
                    ? -1
                    : buttons & JoystickButtons.Down
                    ? 1
                    : 0
        } else {
            const threshold = -1
            if (x < -threshold) buttons |= JoystickButtons.Left
            else if (x > threshold) buttons |= JoystickButtons.Right
            else buttons &= ~(JoystickButtons.Left | JoystickButtons.Right)
            if (y < -threshold) buttons |= JoystickButtons.Up
            else if (y > threshold) buttons |= JoystickButtons.Down
            else buttons &= ~(JoystickButtons.Up | JoystickButtons.Down)
        }
        this.reading.setValues([buttons, x, y])

        if (buttons !== oldButtons) {
            this.sendEvent(
                JoystickEvent.ButtonsChanged,
                jdpack<[number]>("u32", [buttons])
            )
        }
    }

    /**
     * Read the state of a browser gamepad and apply it to the sensor
     * @param gamepad
     */
    update(gamepad: Gamepad) {
        const { buttons, axes } = gamepad
        const [buttonsAvailable] = this.buttonsAvailable.values()

        let newButtons: JoystickButtons = 0
        for (const [b, id] of standardGamepadMapping) {
            if ((b & buttonsAvailable) == b && !!buttons[id].pressed) {
                newButtons |= b
            }
        }

        let newX = 0,
            newY = 0
        if (!this.isDigital) {
            const [axeLeftRight, axeUpDown] = axes
            newX = axeLeftRight
            newY = axeUpDown
        }

        this.updateDirection(newButtons, newX, newY)
    }
}
