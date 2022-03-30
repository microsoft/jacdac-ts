import {
    BuzzerCmd,
    DotMatrixReg,
    LedCmd,
    LedDisplayReg,
    LedStripCmd,
    SRV_ACCELEROMETER,
    SRV_BUTTON,
    SRV_BUZZER,
    SRV_DOT_MATRIX,
    SRV_LED,
    SRV_LED_DISPLAY,
    SRV_LED_STRIP,
    SRV_MOTION,
    SRV_POTENTIOMETER,
    SRV_RELAY,
    SRV_ROTARY_ENCODER,
    SRV_SWITCH,
} from "../jdom/constants"
import { lightEncode } from "../jdom/light"
import { jdpack } from "../jdom/pack"
import { delay } from "../jdom/utils"
import { ServiceMemberOptions } from "./nodes"
import {
    EventTestRule,
    ReadingTestRule,
    ServiceTestRule,
    SetIntensityAndValueTestRule,
    TestState,
} from "./spec"

const testColors = [0x990000, 0x009900, 0x000099, 0]
const builtinTestRules: Record<number, ServiceTestRule[]> = {
    [SRV_SWITCH]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
        },
    ],
    [SRV_RELAY]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "intensity",
            value: 0,
        },
        <ReadingTestRule>{
            type: "intensity",
            value: 1,
        },
        <SetIntensityAndValueTestRule>{
            type: "setIntensityAndValue",
            name: "activate every 2s",
            steps: [
                {
                    duration: 2000,
                    intensity: 0,
                },
                {
                    duration: 2000,
                    intensity: 1,
                },
            ],
        },
    ],
    [SRV_ACCELEROMETER]: <ServiceTestRule[]>[
        <EventTestRule>{
            type: "event",
            eventName: "face_up",
        },
        <EventTestRule>{
            type: "event",
            eventName: "face_down",
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_up",
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_down",
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_left",
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_right",
        },
        <EventTestRule>{
            type: "event",
            eventName: "shake",
        },
    ],
    [SRV_BUTTON]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.001,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.001,
        },
        <EventTestRule>{
            type: "event",
            eventName: "down",
        },
        <EventTestRule>{
            type: "event",
            eventName: "up",
        },
    ],
    [SRV_MOTION]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
        },
        <EventTestRule>{
            type: "event",
            name: "movement",
        },
    ],
    [SRV_POTENTIOMETER]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.01,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.01,
        },
    ],
    [SRV_ROTARY_ENCODER]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: -2,
        },
        <ReadingTestRule>{
            type: "reading",
            value: -1,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 0,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 2,
        },
    ],
}

export function resolveTestRules(serviceClass: number) {
    return builtinTestRules[serviceClass]
}

const builtinServiceCommandTests: Record<number, ServiceMemberOptions> = {
    [SRV_DOT_MATRIX]: {
        name: "blink matrix",
        start: test => {
            const service = test.service
            let mounted = true
            const work = async () => {
                const dotsRegister = service.register(DotMatrixReg.Dots)
                const brightnessRegister = service.register(
                    DotMatrixReg.Brightness
                )
                let dots: Uint8Array = undefined
                while (dots === undefined && mounted) {
                    await dotsRegister.refresh(true)
                    dots = dotsRegister.unpackedValue[0]
                }
                let state = 0xff
                let brightness = 1
                while (mounted) {
                    dots.fill(state)
                    await Promise.all([
                        brightnessRegister.sendSetPackedAsync([brightness]),
                        dotsRegister.sendSetPackedAsync([dots]),
                    ])
                    brightnessRegister.scheduleRefresh()
                    dotsRegister.scheduleRefresh()
                    if (state > 0) brightness = (brightness + 0.1) % 1.01
                    state = ~state
                    await delay(500)
                    test.state = TestState.Pass
                }
            }
            work()
            return () => {
                mounted = false
            }
        },
    },
    [SRV_LED_DISPLAY]: {
        name: "cycle red, green, blue colors on all LEDs",
        start: test => {
            const service = test.service
            let mounted = true
            const work = async () => {
                const pixelsRegister = service.register(LedDisplayReg.Pixels)
                const numPixelsRegister = service.register(
                    LedDisplayReg.NumPixels
                )
                let n: number = undefined
                while (n === undefined && mounted) {
                    await numPixelsRegister.refresh(true)
                    n = numPixelsRegister.uintValue
                }
                const pixels = new Uint8Array(n * 3)
                let k = 0
                while (mounted) {
                    const color = testColors[k++ % testColors.length]
                    for (let i = 0; i < n; ++i) {
                        pixels[i * 3] = (color >> 16) & 0xff
                        pixels[i * 3 + 1] = (color >> 8) & 0xff
                        pixels[i * 3 + 2] = (color >> 0) & 0xff
                    }
                    await pixelsRegister.sendSetPackedAsync([pixels], true)
                    await delay(500)
                    if (k > testColors.length) test.state = TestState.Pass
                }
            }
            work()
            return () => {
                mounted = false
            }
        },
    },
    [SRV_LED_STRIP]: {
        name: "cycle red, green, blue colors on all LEDs",
        start: test => {
            let mounted = true
            const work = async () => {
                const service = test.service
                let k = 0
                while (mounted) {
                    const color = testColors[k++ % testColors.length]
                    const encoded = lightEncode(
                        `setall #
                            show 20`,
                        [color]
                    )
                    await service?.sendCmdAsync(LedStripCmd.Run, encoded)
                    await delay(500)

                    if (k > testColors.length) test.state = TestState.Pass
                }
            }
            work()
            return () => {
                mounted = false
            }
        },
    },
    [SRV_BUZZER]: {
        name: "beeps every 200ms every 1s, with increasing frequency",
        start: test => {
            let mounted = true
            const pack = (frequency: number, ms: number, volume: number) => {
                const period = (1000000 / frequency) | 0
                const duty = (period * volume) >> 11
                return jdpack<[number, number, number]>("u16 u16 u16", [
                    period,
                    duty,
                    ms,
                ])
            }
            const work = async () => {
                test.state = TestState.Running
                let f = 440
                while (mounted) {
                    const service = test.service
                    if (!service) {
                        await delay(500)
                        return
                    }
                    await service.sendCmdAsync(
                        BuzzerCmd.PlayTone,
                        pack(f, 200, 20)
                    )
                    await delay(1000)
                    f = f >> 1
                    if (f > 4096) f = 440
                    test.state = TestState.Pass
                }
            }
            // start work async
            work()
            return () => {
                mounted = false
            }
        },
    },
    [SRV_LED]: {
        name: "cycles through RGB every 0.5s",
        start: test => {
            let mounted = true
            const pack = (
                r: number,
                g: number,
                b: number,
                animDelay: number
            ) => {
                const unpacked: [number, number, number, number] = [
                    r,
                    g,
                    b,
                    animDelay,
                ]
                return jdpack("u8 u8 u8 u8", unpacked)
            }
            const work = async () => {
                test.state = TestState.Running
                while (mounted) {
                    const service = test.service
                    if (!service) {
                        await delay(500)
                        return
                    }
                    await service.sendCmdAsync(
                        LedCmd.Animate,
                        pack(255, 0, 0, 200)
                    )
                    await delay(500)
                    if (!mounted) return
                    await service.sendCmdAsync(
                        LedCmd.Animate,
                        pack(0, 255, 0, 200)
                    )
                    await delay(500)
                    if (!mounted) return
                    await service.sendCmdAsync(
                        LedCmd.Animate,
                        pack(0, 0, 255, 200)
                    )
                    await delay(500)
                    if (!mounted) return
                    await service.sendCmdAsync(
                        LedCmd.Animate,
                        pack(0, 0, 0, 200)
                    )
                    await delay(500)

                    test.state = TestState.Pass
                }
            }
            // start work async
            work()
            return () => {
                mounted = false
            }
        },
    },
}

export function resolveServiceCommandTest(serviceClass: number) {
    return builtinServiceCommandTests[serviceClass]
}
