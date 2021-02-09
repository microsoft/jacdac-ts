import { ArcadeGamepadButton, ArcadeGamepadReg, SRV_ARCADE_GAMEPAD } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import SensorServiceHost from "./sensorservicehost";

export const defaultButtons = [
    ArcadeGamepadButton.Left,
    ArcadeGamepadButton.Right,
    ArcadeGamepadButton.Down,
    ArcadeGamepadButton.Up,
    ArcadeGamepadButton.A,
    ArcadeGamepadButton.B,
    ArcadeGamepadButton.Menu,
    ArcadeGamepadButton.Select,
    ArcadeGamepadButton.Exit,
]

// https://w3c.github.io/gamepad/#remapping
const standardGamepadMapping: { [btn: number]: number } = {
    [ArcadeGamepadButton.Left]: 14,
    [ArcadeGamepadButton.Right]: 15,
    [ArcadeGamepadButton.Up]: 12,
    [ArcadeGamepadButton.Down]: 13,
    [ArcadeGamepadButton.A]: 0,
    [ArcadeGamepadButton.B]: 1,
    [ArcadeGamepadButton.Select]: 8,
    [ArcadeGamepadButton.Menu]: 9,
}

export default class ArcadeGamepadServiceHost
    extends SensorServiceHost<[([ArcadeGamepadButton, number])[]]> {
    readonly availableButtons: RegisterHost<[([ArcadeGamepadButton])[]]>;

    constructor(availableButtons?: ArcadeGamepadButton[]) {
        super(SRV_ARCADE_GAMEPAD, {
            readingValues: [[]]
        })

        this.availableButtons = this.addRegister<[([ArcadeGamepadButton])[]]>(ArcadeGamepadReg.AvailableButtons, [(availableButtons || defaultButtons).map(v => [v])]);
    }

    async down(button: ArcadeGamepadButton, pressure: number) {
        const [values] = this.reading.values();
        let value = values.find(v => v[0] === button);
        if (!value) {
            value = [button, pressure];
            values.push(value);
        }
        value[1] = pressure;
        console.log({ values })
        this.reading.setValues([values]);
    }

    async up(button: ArcadeGamepadButton) {
        const [values] = this.reading.values();
        const valuei = values.findIndex(v => v[0] === button);
        if (valuei >= -1) {
            values.splice(valuei, 1)
            this.reading.setValues([values]);
        }
    }

    /**
     * Read the state of a browser gamepad and apply it to the sensor
     * @param gamepad 
     */
    update(gamepad: Gamepad) {
        const { buttons, axes } = gamepad;
        const [arcadeButtons] = this.availableButtons.values()
        const values: [ArcadeGamepadButton, number][] = [];

        // handle buttons
        for (const [arcadeButton] of arcadeButtons) {
            const mapped = standardGamepadMapping[arcadeButton];
            if (mapped !== undefined) {
                const down = buttons[mapped].pressed ? 1 : 0;
                values.push([arcadeButton, down]);
            }
        }
        // handle sticks (sticks win)
        const [axeLeftRight, axeUpDown] = axes;
        if (Math.abs(axeLeftRight) > 0.01) {
            if (axeLeftRight < 0) { // tilting left
                let left = values.find(v => v[0] === ArcadeGamepadButton.Left);
                if (!left)
                    values.push(left = [ArcadeGamepadButton.Left, 0]);
                left[1] = -axeLeftRight;
                const righti = values.findIndex(v => v[0] === ArcadeGamepadButton.Right);
                if (righti > -1)
                    values.splice(righti, 1);
            } else {
                let right = values.find(v => v[0] === ArcadeGamepadButton.Right);
                if (!right)
                    values.push(right = [ArcadeGamepadButton.Right, 0]);
                right[1] = axeLeftRight;
                const lefti = values.findIndex(v => v[0] === ArcadeGamepadButton.Left);
                if (lefti > -1)
                    values.splice(lefti, 1);
            }
        }
        if (Math.abs(axeUpDown) > 0.01) {
            if (axeUpDown < 0) { // tilting left
                let up = values.find(v => v[0] === ArcadeGamepadButton.Up);
                if (!up)
                    values.push(up = [ArcadeGamepadButton.Up, 0]);
                up[1] = -axeUpDown;
                const downi = values.findIndex(v => v[0] === ArcadeGamepadButton.Down);
                if (downi > -1)
                    values.splice(downi, 1);
            } else {
                let down = values.find(v => v[0] === ArcadeGamepadButton.Down);
                if (!down)
                    values.push(down = [ArcadeGamepadButton.Down, 0]);
                down[1] = axeUpDown;
                const upi = values.findIndex(v => v[0] === ArcadeGamepadButton.Up);
                if (upi > -1)
                    values.splice(upi, 1);
            }
        }

        this.reading.setValues([values]);
    }
}