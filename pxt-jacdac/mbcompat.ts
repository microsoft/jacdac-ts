namespace control {
    /**
     * Used internally
     */
    //% flags.defl=0 shim=control::onEvent
    export declare function internalOnEvent(
        src: number,
        value: number,
        handler: () => void,
        flags?: number
    ): void

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
    if (identifyAnimationRunning) return

    identifyAnimationRunning = true
    const sc = led.screenshot()
    control.runInParallel(() => {
        led.stopAnimation()
        basic.showAnimation(
            `0###0 00000 0###0  00000 0###0  00000
        0###0 00000 0###0  00000 0###0  00000 
        0###0 00000 0###0  00000 0###0  00000 
        00##0 00000 00##0  00000 00##0  00000 
        00000 00000 00000  00000 00000  00000`,
            250
        )
        sc.plotFrame(0)
        identifyAnimationRunning = false
    })
}

function handleStatusEvent(event: jacdac.StatusEvent) {
    switch (event) {
        case jacdac.StatusEvent.ProxyStarted:
            identifyAnimation()
            break
        case jacdac.StatusEvent.ProxyPacketReceived:
            basic.plotLeds(`
                . # # # .
                . # # # .
                . # # # .
                . . # # .
                . . . . .
                `)
            break
        case jacdac.StatusEvent.Identify:
            identifyAnimation()
            break
    }
}

// don't use any jacdac static - it isn't initialized here yet in sim (pxt bug)
jacdac.onPlatformStart = function () {
    jacdac.bus.on(jacdac.STATUS_EVENT, handleStatusEvent)
    if (settings.exists(jacdac.JACDAC_PROXY_SETTING)) {
        input.onButtonPressed(Button.A, () => control.reset())
        input.onButtonPressed(Button.B, () => control.reset())
    }
}

/**
 * force v2.
 */
//% parts=v2
function useV2() {}
useV2()
