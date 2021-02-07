import { ArcadeGamepadButton, ArcadeGamepadReg, SRV_ARCADE_GAMEPAD } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import SensorServiceHost from "./sensorservicehost";

const defaultButtons = [
    ArcadeGamepadButton.Left,
    ArcadeGamepadButton.Right,
    ArcadeGamepadButton.Down,
    ArcadeGamepadButton.Up,
    ArcadeGamepadButton.A,
    ArcadeGamepadButton.B,
    ArcadeGamepadButton.Menu,
    ArcadeGamepadButton.Select,
    ArcadeGamepadButton.Reset,
    ArcadeGamepadButton.Exit,
]

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
}