import {
    LedCmd,
    LedDisplayReg,
    LedStripCmd,
    SRV_BUTTON,
    SRV_LED,
    SRV_LED_DISPLAY,
    SRV_LED_STRIP,
    SRV_MOTION,
    SRV_POTENTIOMETER,
    SRV_ROTARY_ENCODER,
    SRV_SWITCH,
} from "../jdom/constants"
import { lightEncode } from "../jdom/light"
import { jdpack } from "../jdom/pack"
import { delay } from "../jdom/utils"
import {
    ServiceMemberOptions,
} from "./nodes"
import {
    EventTestRule,
    ReadingTestRule,
    ServiceTestRule,
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
            name: "down",
        },
        <EventTestRule>{
            type: "event",
            name: "up",
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
            value: -4,
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
            value: 4,
        },
    ],
}

export function resolveTestRules(serviceClass: number) {
    return builtinTestRules[serviceClass]
}

const builtinServiceCommandTests: Record<number, ServiceMemberOptions> = {
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
