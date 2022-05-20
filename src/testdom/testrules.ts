import {
    BuzzerCmd,
    DotMatrixReg,
    GamepadReg,
    GamepadEvent,
    GamepadButtons,
    LedReg,
    LedStripCmd,
    SRV_ACCELEROMETER,
    SRV_BUTTON,
    SRV_BUZZER,
    SRV_DOT_MATRIX,
    SRV_GAMEPAD,
    SRV_LED,
    SRV_LED_STRIP,
    SRV_MOTION,
    SRV_POTENTIOMETER,
    SRV_RELAY,
    SRV_ROTARY_ENCODER,
    SRV_SWITCH,
    REPORT_UPDATE,
    RotaryEncoderReg,
    SRV_LIGHT_LEVEL,
    SRV_MAGNETIC_FIELD_LEVEL,
} from "../jdom/constants"
import { lightEncode } from "../jdom/light"
import { jdpack } from "../jdom/pack"
import { delay } from "../jdom/utils"
import {
    EventTest,
    RegisterTest,
    ServiceMemberOptions,
    ServiceMemberTestNode,
} from "./nodes"
import {
    EventTestRule,
    ReadingTestRule,
    ServiceTestRule,
    SetIntensityAndValueTestRule,
    TestState,
} from "./spec"

const testColors = [0x220000, 0x002200, 0x000022, 0]
const builtinTestRules: Record<number, ServiceTestRule[]> = {
    [SRV_SWITCH]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            manualSteps: {
                prepare: "switch to inactive",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            manualSteps: {
                prepare: "switch to active",
            },
        },
    ],
    [SRV_RELAY]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "intensity",
            value: 0,
            factory: true,
        },
        <ReadingTestRule>{
            type: "intensity",
            value: 1,
            factory: true,
        },
        <SetIntensityAndValueTestRule>{
            type: "setIntensityAndValue",
            name: "activate and deactive every 5s",
            factory: true,
            steps: [
                {
                    duration: 5000,
                    intensity: 0,
                },
                {
                    duration: 5000,
                    intensity: 1,
                },
            ],
        },
    ],
    [SRV_ACCELEROMETER]: <ServiceTestRule[]>[
        <EventTestRule>{
            type: "event",
            eventName: "face_up",
            manualSteps: {
                prepare: "turn face up",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "face_down",
            manualSteps: {
                prepare: "turn face down",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_up",
            manualSteps: {
                prepare: "tilt up",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_down",
            manualSteps: {
                prepare: "tilt down",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_left",
            manualSteps: {
                prepare: "tilt left",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_right",
            manualSteps: {
                prepare: "tilt right",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "shake",
            manualSteps: {
                prepare: "shake device",
            },
        },
    ],
    [SRV_BUTTON]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.001,
            factory: true,
            manualSteps: {
                prepare: "release button",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.001,
            factory: true,
            manualSteps: {
                prepare: "press button",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "down",
            factory: true,
        },
        <EventTestRule>{
            type: "event",
            eventName: "up",
            factory: true,
        },
    ],
    [SRV_MOTION]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            factory: true,
            manualSteps: {
                prepare: "do not move",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            factory: true,
            manualSteps: {
                prepare: "move",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "movement",
            factory: true,
        },
    ],
    [SRV_MAGNETIC_FIELD_LEVEL]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.05,
            factory: true,
            manualSteps: {
                prepare: "remove magnet",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.02,
            factory: true,
            manualSteps: {
                prepare: "place north pole on top of sensor",
            },
        },        
        <ReadingTestRule>{
            type: "reading",
            value: -1,
            tolerance: 0.02,
            factory: true,
            manualSteps: {
                prepare: "place south pole on top of sensor",
            },
        },
    ],
    [SRV_POTENTIOMETER]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.01,
            factory: true,
            manualSteps: {
                prepare: "slide to minimum",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 0.5,
            tolerance: 0.01,
            manualSteps: {
                prepare: "slide to middle",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.01,
            factory: true,
            manualSteps: {
                prepare: "slide to maximum",
            },
        },
    ],
    [SRV_LIGHT_LEVEL]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            tolerance: 0.1,
            factory: true,
            manualSteps: {
                prepare: "cover sensor to block light",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.1,
            factory: true,
            manualSteps: {
                prepare: "apply bright light to sensor",
            },
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
            factory: true,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 0,
            factory: true,
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            factory: true,
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

function createGamepadButtonTests(
    test: ServiceMemberTestNode,
    buttons: number
) {
    const addReadingTest = (name: string, flag: number) => {
        let seenEventArg = false
        test.appendChild(
            new RegisterTest(
                `${name} reading`,
                {
                    prepare: `press ${name} button`,
                },
                GamepadReg.Direction,
                (node, logger) => {
                    const { register } = node
                    const [buttons] = (register.unpackedValue || []) as [
                        GamepadButtons,
                        number,
                        number
                    ]
                    const seen = !!(buttons & flag)
                    if (!seenEventArg && !seen)
                        logger(`reading not observed or incorrect flag`)
                    else if (seen) {
                        seenEventArg = seen
                    }
                    return seenEventArg ? TestState.Pass : TestState.Running
                }
            )
        )
    }
    const addEventTest = (name: string, flag: number) => {
        let seenEventArg = false
        test.appendChild(
            new EventTest(
                `${name} event`,
                {
                    prepare: `press ${name} button to raise event`,
                },
                GamepadEvent.ButtonsChanged,
                (node, logger) => {
                    const { event } = node
                    const seen = !!(event?.count > 0 && event?.data[0] & flag)
                    if (!seenEventArg && !seen)
                        logger(`event not observed or incorrect flag`)
                    else if (seen) {
                        seenEventArg = seen
                    }
                    return seenEventArg ? TestState.Pass : TestState.Running
                }
            )
        )
    }
    if (test.children.length !== 0) return // TODO: revisit this

    for (const key in GamepadButtons) {
        const value = parseInt(GamepadButtons[key])
        if (!isNaN(value)) {
            if (value & buttons) {
                addReadingTest(key, value)
                addEventTest(key, value)
            }
        }
    }
    // if buttons doesn't have any of L/R/D/U, then add the four events,
    // as we have a analog joystick that will generate them
    const LRUD: number[] = [
        GamepadButtons.Down,
        GamepadButtons.Up,
        GamepadButtons.Left,
        GamepadButtons.Right,
    ]
    if (
        !(
            buttons &
            (GamepadButtons.Down |
                GamepadButtons.Up |
                GamepadButtons.Left |
                GamepadButtons.Right)
        )
    ) {
        LRUD.forEach(value => {
            const key = GamepadButtons[value]
            addReadingTest(key, value)
            addEventTest(key, value)
        })
    }
}

const builtinServiceCommandTests: Record<number, ServiceMemberOptions> = {
    [SRV_GAMEPAD]: {
        name: "buttons and events",
        start: test => {
            const service = test.service
            const buttonsAvailable = service.register(
                GamepadReg.ButtonsAvailable
            )
            const buttons = buttonsAvailable.unpackedValue
            if (buttons?.length > 0) {
                createGamepadButtonTests(test, buttons[0])
                return undefined
            } else {
                const unsubscribe = buttonsAvailable.subscribe(
                    REPORT_UPDATE,
                    () => {
                        unsubscribe()
                        createGamepadButtonTests(
                            test,
                            buttonsAvailable.unpackedValue[0]
                        )
                    }
                )
                return unsubscribe
            }
        },
        hasChildren: true,
    },
    [SRV_DOT_MATRIX]: {
        name: "blink matrix",
        manualSteps: {
            validate: "verify all LEDs blink",
        },
        start: test => {
            const service = test.service
            const { factory } = test
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
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
                    if (factory && test.state == TestState.Running)
                        test.state = TestState.Pass
                }
            }
            work()
            return () => {
                mounted = false
            }
        },
    },
    [SRV_LED]: {
        name: "cycle red, green, blue colors on all LEDs starting from the connector, clockwize.",
        manualSteps: {
            validate: "verify colors on LED",
        },
        start: test => {
            const service = test.service
            const factory = test.factory
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
                const pixelsRegister = service.register(LedReg.Pixels)
                const numPixelsRegister = service.register(LedReg.NumPixels)
                let n: number = undefined
                while (n === undefined && mounted) {
                    await numPixelsRegister.refresh(true)
                    n = numPixelsRegister.uintValue
                }
                if (n == 0) {
                    test.state = TestState.Fail
                    test.output = "number of pixels is 0"
                    return
                }
                // cycle through color and turn on pixels one by one
                const pixels = new Uint8Array(n * 3)
                let k = 0
                while (mounted) {
                    if (factory) {
                        // factory test: render all leds
                        const color = testColors[k++ % testColors.length]
                        for (let i = 0; i < n; ++i) {
                            pixels[i * 3] = (color >> 16) & 0xff
                            pixels[i * 3 + 1] = (color >> 8) & 0xff
                            pixels[i * 3 + 2] = (color >> 0) & 0xff
                        }
                        await pixelsRegister.sendSetPackedAsync([pixels], true)
                        await delay(500)
                        if (test.state == TestState.Running)
                            test.state = TestState.Pass
                    } else {
                        // non factory test: render led one by one
                        for (
                            let ci = 0;
                            ci < testColors.length && mounted;
                            ++ci
                        ) {
                            const color = testColors[ci]
                            pixels.fill(0)
                            for (let i = 0; i < n && mounted; ++i) {
                                pixels[i * 3] = (color >> 16) & 0xff
                                pixels[i * 3 + 1] = (color >> 8) & 0xff
                                pixels[i * 3 + 2] = (color >> 0) & 0xff
                                await pixelsRegister.sendSetPackedAsync(
                                    [pixels],
                                    true
                                )
                                await delay(Math.max(100, 500 - i * 20))
                            }
                            if (factory && test.state == TestState.Running)
                                test.state = TestState.Pass
                            // pause for a second
                            await delay(1000)
                            pixels.fill(0)
                            if (!mounted) break
                            await pixelsRegister.sendSetPackedAsync(
                                [pixels],
                                true
                            )
                            await delay(500)
                        }
                    }
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
        manualSteps: {
            validate: "verify colors on LED",
        },
        start: test => {
            const { factory } = test
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
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
                    if (factory && test.state == TestState.Running)
                        test.state = TestState.Pass
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
        manualSteps: {
            validate: "sounds can be heard",
        },
        start: test => {
            const { factory } = test
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
                    f = f << 1
                    if (f > 4096) f = 440
                    if (factory && test.state == TestState.Running)
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
    [SRV_ROTARY_ENCODER]: {
        name: "rotate clockwise slowly 1 full turn, without missing a click",
        start: test => {
            const { factory } = test
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
                const service = test.service
                const clicksPerTurnRegister = service.register(
                    RotaryEncoderReg.ClicksPerTurn
                )
                const positionRegister = service.register(
                    RotaryEncoderReg.Position
                )

                // read number of clicks
                test.output = "reading clicks per turn"
                let clicksPerTurn = 0
                while (mounted && !clicksPerTurn) {
                    await delay(100)
                    await clicksPerTurnRegister.refresh()
                    clicksPerTurn = clicksPerTurnRegister
                        .unpackedValue?.[0] as number
                }

                let lastPosition: number = undefined
                let count = 0
                while (mounted) {
                    await positionRegister.refresh()
                    const position = positionRegister.unpackedValue?.[0]
                    if (lastPosition === position) await delay(20)
                    else if (
                        lastPosition === undefined ||
                        (lastPosition + 1) % clicksPerTurn ===
                            position % clicksPerTurn
                    ) {
                        lastPosition = position % clicksPerTurn
                        count++
                        if (count === clicksPerTurn) {
                            test.output = `${count}/${clicksPerTurn} at ${lastPosition}`
                            test.state = TestState.Pass
                            break
                        }
                    } else {
                        lastPosition = position % clicksPerTurn
                        count = 0
                    }
                    test.output = `${count}/${clicksPerTurn} at ${lastPosition}`
                    if (factory && test.state == TestState.Running)
                        test.state = TestState.Pass
                }
                // look for full sequence
            }
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
