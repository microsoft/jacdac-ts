namespace jacdac {
    export const BUTTON_EVENTS: number[] = [
        DAL.DEVICE_BUTTON_EVT_CLICK,
        DAL.DEVICE_BUTTON_EVT_LONG_CLICK,
        DAL.DEVICE_BUTTON_EVT_DOWN,
        DAL.DEVICE_BUTTON_EVT_UP
    ];
}

const enum JDGamepadCommand {
    Button = 0x80,
    Move = 0x81,
    Throttle = 0x82,
}

const enum JDDimension {
    //% block=x
    X = 0,
    //% block=y
    Y = 1,
    //% block=z
    Z = 2,
    //% block=strength
    Strength = 3
}

const enum JDControllerCommand {
    ClientButtons = 1,
    ControlServer = 2,
    ControlClient = 3
}

const enum JDControllerButton {
    A = 5,
    B = 6,
    Left = 1,
    Up = 2,
    Right = 3,
    Down = 4,
    Menu = 7
}
