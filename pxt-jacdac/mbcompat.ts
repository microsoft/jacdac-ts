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

let identifyAnimationRunning = false
function identifyAnimation() {
    console.log(`identify ` + identifyAnimationRunning)
    if (identifyAnimationRunning)
        return

    identifyAnimationRunning = true;
    const sc = led.screenshot()
    control.runInParallel(() => {
        led.stopAnimation();
        basic.showAnimation(
       `0###0 00000 0###0  00000 0###0  00000
        0###0 00000 0###0  00000 0###0  00000 
        0###0 00000 0###0  00000 0###0  00000 
        00##0 00000 00##0  00000 00##0  00000 
        00000 00000 00000  00000 00000  00000`, 250);
        sc.plotFrame(0)
        identifyAnimationRunning = false;
    })
}

jacdac.onStatusEvent = function (event) {
    switch (event) {
        case jacdac.StatusEvent.ProxyStarted:
            identifyAnimation()
            break;
        case jacdac.StatusEvent.ProxyPacketReceived:
            basic.plotLeds(`
            . # # # .
            . # # # .
            . # # # .
            . . # # .
            . . . . .
            `)
            led.toggle(1, 3);
            break;
        case jacdac.StatusEvent.Identify:
            identifyAnimation();
            break;
    }
}

// don't use jacdac.JACDAC_PROXY_SETTING - it isn't initialized here yet in sim (pxt bug)
if (settings.exists("__jacdac_proxy")) {
    input.onButtonPressed(Button.A, () => control.reset())
    input.onButtonPressed(Button.B, () => control.reset())
}

/**
 * force v2.
 */
//% parts=v2
function useV2() {
}
useV2();
