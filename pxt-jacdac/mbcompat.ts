namespace control {
    /**
     * Used internally
     */
    //% flags.defl=0 shim=control::onEvent
    export declare function internalOnEvent(src: number, value: number, handler: () => void, flags?: number): void;

    export function getConfigValue(key: number, defl: number): number {
        return defl
    }
}

namespace pins {
    export function pinByCfg(key: number): DigitalInOutPin {
        return null
    }
}

jacdac.onStatusEvent = function (event) {
    switch (event) {
        case jacdac.StatusEvent.ProxyStarted:
            basic.showLeds(`
            . # # # .
            . # # # .
            . # # # .
            . . # # .
            . . . . .
            `)
            break;
        case jacdac.StatusEvent.ProxyPacketReceived:
            led.toggle(1, 3);
            break;
    }
}

// don't use jacdac.JACDAC_PROXY_SETTING - it isn't initialized here yet in sim (pxt bug)
if (settings.exists("__jacdac_proxy")) {
    input.onButtonPressed(Button.A, () => control.reset())
    input.onButtonPressed(Button.B, () => control.reset())
}

// force v2, TODO: do something better here
input.logoIsPressed()
