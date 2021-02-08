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
        const { buttons } = gamepad;
        const [arcadeButtons] = this.availableButtons.values()
        const values: [ArcadeGamepadButton, number][] = [];

        for (const [arcadeButton] of arcadeButtons) {
            const mapped = standardGamepadMapping[arcadeButton];
            if (mapped !== undefined) {
                const down = buttons[mapped].pressed ? 1 : 0;
                values.push([arcadeButton, down]);
            }
        }

        this.reading.setValues([values]);
    }
}