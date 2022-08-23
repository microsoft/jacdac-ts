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
    SRV_DISTANCE,
    SRV_TEMPERATURE,
    SRV_HUMIDITY,
    SRV_SERVO,
    ServoReg,
    SRV_VIBRATION_MOTOR,
    VibrationMotorCmd,
    SRV_POWER,
    PowerReg,
    PowerPowerStatus,
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
            name: "activate and deactive every 3s",
            factory: true,
            steps: [
                {
                    duration: 3000,
                    intensity: 0,
                },
                {
                    duration: 3000,
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
            factory: true,
            manualSteps: {
                prepare: "tilt up",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_down",
            factory: true,
            manualSteps: {
                prepare: "tilt down",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_left",
            factory: true,
            manualSteps: {
                prepare: "tilt left",
            },
        },
        <EventTestRule>{
            type: "event",
            eventName: "tilt_right",
            factory: true,
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
            tolerance: 0.2,
            factory: true,
            manualSteps: {
                prepare: "remove magnet",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 1,
            tolerance: 0.3,
            factory: true,
            manualSteps: {
                prepare: "place north pole on top of sensor",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: -1,
            tolerance: 0.3,
            factory: true,
            manualSteps: {
                prepare: "place south pole on top of sensor",
            },
        },
    ],
    [SRV_DISTANCE]: <ServiceTestRule[]>[
        <ReadingTestRule>{
            type: "reading",
            value: 0.1,
            samples: 5,
            factory: true,
            op: "<",
            manualSteps: {
                prepare:
                    "cover distance sensor to get a reading less than 10cm",
            },
        },
        <ReadingTestRule>{
            type: "reading",
            value: 0.4,
            samples: 5,
            factory: true,
            manualSteps: {
                prepare: "uncover distance sensor with at least 40cm free",
            },
            op: ">",
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
const builtinReadingTolerances: Record<number, number> = {
    [SRV_TEMPERATURE]: 2,
    [SRV_HUMIDITY]: 4,
}

export function resolveTestRules(serviceClass: number) {
    return builtinTestRules[serviceClass]
}

export function resolveReadingTolerage(serviceClass: number) {
    return builtinReadingTolerances[serviceClass]
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
    [SRV_SERVO]: {
        name: "change angle",
        manualSteps: {
            validate:
                "verify arm is moving between 0 (min), 1/3, 1/2, and 1 (max)",
        },
        start: test => {
            const { factory } = test
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
                const service = test.service
                const enabled = service.intensityRegister
                const angleRegister = service.valueRegister
                const actualAngleRegister = service.readingRegister
                const minAngleRegister = service.register(ServoReg.MinAngle)
                const maxAngleRegister = service.register(ServoReg.MaxAngle)

                while (mounted) {
                    await minAngleRegister.refresh()
                    await maxAngleRegister.refresh()
                    const minAngle: number =
                        minAngleRegister.unpackedValue?.[0] || 0
                    const maxAngle: number =
                        maxAngleRegister?.unpackedValue?.[0] || 0

                    const na = 9
                    const da = (maxAngle - minAngle) / (na - 1)
                    const angles = [
                        ...Array(na)
                            .fill(0)
                            .map((_, i) => minAngle + i * da),
                        ...Array(na)
                            .fill(0)
                            .map((_, i) => maxAngle - i * da),
                    ]
                    const tolerance = (maxAngle - minAngle) / 10

                    // min angle
                    for (const angle of angles) {
                        if (!mounted) break

                        await enabled.sendSetBoolAsync(true)
                        await angleRegister.sendSetPackedAsync([angle])

                        await delay(700)
                        await angleRegister.sendGetAsync()
                        await actualAngleRegister.sendGetAsync()

                        if (!actualAngleRegister.notImplemented) {
                            const angle: number =
                                angleRegister.unpackedValue?.[0]
                            const actualAngle: number =
                                actualAngleRegister.unpackedValue?.[0]
                            if (Math.abs(actualAngle - angle) > tolerance) {
                                test.state = TestState.Fail
                                test.output = `expected angle ${angle}, got actual angle ${actualAngle}`
                            }
                        }
                    }

                    if (factory && test.state == TestState.Running)
                        test.state = TestState.Pass
                }

                // turn off servo
                await enabled.sendSetBoolAsync(false)
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
    [SRV_POWER]: {
        name: "power on/off at a 3s interval",
        manualSteps: {
            validate: "power can be observed",
        },
        start: test => {
            const { factory } = test
            const INTERVAL = 3000
            let mounted = true
            const work = async () => {
                test.state = TestState.Running
                while (mounted) {
                    const service = test.service
                    if (!service) {
                        await delay(500)
                        return
                    }
                    let ok = true
                    const allowed = service.register(PowerReg.Allowed)
                    const powerStatus = service.register(PowerReg.PowerStatus)
                    const currentDraw = service.register(PowerReg.CurrentDraw)
                    await allowed.sendSetBoolAsync(true, true)
                    await delay(INTERVAL)
                    await powerStatus.refresh()

                    // check state
                    if (
                        powerStatus.unpackedValue?.[0] !=
                        PowerPowerStatus.Powering
                    ) {
                        test.output = "power status is not powering"
                        ok = false
                    } else if (!currentDraw.notImplemented) {
                        await currentDraw.refresh()
                        if (currentDraw.uintValue == 0) {
                            test.output = "current draw is 0"
                            ok = false
                        }
                    }

                    // turn off power
                    await allowed.sendSetBoolAsync(false, true)
                    await delay(INTERVAL)

                    // check state
                    await powerStatus.refresh()
                    if (
                        powerStatus.unpackedValue?.[0] !=
                        PowerPowerStatus.Disallowed
                    ) {
                        test.output = "power status is not dissallowed"
                        ok = false
                    } else if (!currentDraw.notImplemented) {
                        await currentDraw.refresh()
                        if (currentDraw.uintValue != 0) {
                            test.output = "current draw is 0"
                            ok = false
                        }
                    }

                    if (ok && factory && test.state == TestState.Running)
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
    [SRV_VIBRATION_MOTOR]: {
        name: "vibration with increasing duration, strength",
        manualSteps: {
            validate: "vibration can be detected",
        },
        start: test => {
            const { factory } = test
            const MAX_DURATION = 512
            let mounted = true
            const pack = (ms: number, volume: number) => {
                return jdpack<[[number, number][]]>("r: u8 u0.8", [
                    [[ms >> 3, volume]],
                ])
            }
            const work = async () => {
                test.state = TestState.Running
                let ms = 64
                while (mounted) {
                    const service = test.service
                    if (!service) {
                        await delay(500)
                        return
                    }
                    await service.sendCmdAsync(
                        VibrationMotorCmd.Vibrate,
                        pack(ms, ms / MAX_DURATION)
                    )
                    await delay(ms + 1000)
                    ms = ms << 1
                    if (ms > MAX_DURATION) {
                        ms = 64
                        if (factory && test.state == TestState.Running)
                            test.state = TestState.Pass
                    }
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
