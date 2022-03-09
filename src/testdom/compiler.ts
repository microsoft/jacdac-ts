import { JDBus } from "../jdom/bus"
import {
    BaseReg,
    ControlReg,
    LedCmd,
    LedDisplayReg,
    LedStripCmd,
    SRV_BUTTON,
    SRV_CONTROL,
    SRV_LED,
    SRV_LED_DISPLAY,
    SRV_LED_STRIP,
    SRV_MOTION,
    SRV_POTENTIOMETER,
    SRV_ROTARY_ENCODER,
    SRV_SWITCH,
    SystemReg,
    SystemStatusCodes,
} from "../jdom/constants"
import { lightEncode } from "../jdom/light"
import { jdpack } from "../jdom/pack"
import { serviceName } from "../jdom/pretty"
import {
    isEvent,
    isReading,
    serviceSpecificationFromClassIdentifier,
    serviceSpecificationFromName,
} from "../jdom/spec"
import { delay, JSONTryParse } from "../jdom/utils"
import {
    DeviceTest,
    EventTest,
    PanelTest,
    RegisterOracle,
    RegisterTest,
    ServiceCommandTest,
    ServiceMemberOptions,
    ServiceTest,
    StatusLightTest,
    TestLogger,
    TestNode,
} from "./nodes"
import {
    DeviceTestSpec,
    EventTestRule,
    OrableTestSpec,
    PanelTestSpec,
    ReadingTestRule,
    ServiceTestRule,
    ServiceTestSpec,
    TestState,
} from "./spec"

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

const testColors = [0x990000, 0x009900, 0x000099, 0]
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

function createReadingRule(
    rule: ReadingTestRule
): (node: RegisterTest, logger: TestLogger) => TestState {
    const threshold = 2
    let samples = 0
    let seen = samples >= threshold
    const { value, tolerance } = rule
    return (node, logger) => {
        if (!seen) {
            const { register } = node
            const [current] = register.unpackedValue
            const active =
                current !== undefined &&
                (isNaN(tolerance) || tolerance <= 0
                    ? current === value
                    : Math.abs(current - value) <= tolerance)
            if (active) samples++
            else samples = 0
            // recompute
            seen = samples >= threshold
        }
        if (!seen) logger(`missing or incorrect reading value`)
        return seen ? TestState.Pass : TestState.Fail
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createEventRule(
    rule: EventTestRule
): (node: EventTest, logger: TestLogger) => TestState {
    return (node, logger) => {
        const { event } = node
        const seen = event?.count > 0
        if (!seen) logger(`event not observed`)
        return event?.count > 0 ? TestState.Pass : TestState.Fail
    }
}

function createOracleRule(
    oracle: OrableTestSpec
): (node: RegisterTest, logger: TestLogger) => TestState {
    let samples = 0
    const threshold = 5
    const { tolerance } = oracle
    return (node, logger) => {
        const { register } = node
        // find oracle register
        const oracleRegister = node.resolveOracle(register)?.register
        if (!oracleRegister) {
            logger(`oracle not found`)
            return TestState.Fail
        }

        const [oracleValue] = (oracleRegister.unpackedValue || []) as [number]
        const [value] = (register.unpackedValue || []) as [number]

        //console.log("oracle", { oracleValue, value })
        if (
            tolerance <= 0
                ? value === oracleValue
                : Math.abs(value - oracleValue) <= tolerance
        ) {
            samples++
        } else {
            samples = 0
        }

        if (samples == 0) {
            logger(`register value does not match oracle`)
            return TestState.Fail
        }
        if (samples < threshold) {
            logger(`sampling register values...`)
            return TestState.Running
        } else return TestState.Pass
    }
}

function compileTestRule(
    specification: jdspec.ServiceSpec,
    rule: ServiceTestRule
): TestNode {
    const { type } = rule
    switch (type) {
        case "reading": {
            const readingRule = rule as ReadingTestRule
            const { value, tolerance } = readingRule
            return new RegisterTest(
                `observe reading == ${value}${
                    tolerance ? ` +/-${tolerance}` : ""
                }`,
                SystemReg.Reading,
                createReadingRule(readingRule)
            )
        }
        case "event": {
            const eventRule = rule as EventTestRule
            const { name } = eventRule
            const pkt = specification.packets.find(
                pkt => isEvent(pkt) && pkt.name === name
            )
            return new EventTest(
                `raise event ${name}`,
                pkt.identifier,
                createEventRule(eventRule)
            )
        }
        default:
            return undefined
    }
}

function parseIdentifier(value: number | string) {
    if (typeof value === "string" && /^0x[0-9a-f]+$/i.test(value as string)) {
        return parseInt(value, 16)
    } else if (typeof value === "string" && /^[0-9]+$/i.test(value as string))
        return parseInt(value)
    return Number(value)
}

export function tryParsePanelTestSpec(source: string) {
    const json = JSONTryParse(source) as PanelTestSpec
    if (
        json.devices &&
        Array.isArray(json.devices) &&
        json.devices.every(d => !!d.productIdentifier && d.count > 0) &&
        (!json.oracles ||
            (Array.isArray(json.oracles) &&
                json.oracles.every(o => !!o?.serviceClass && !!o?.deviceId)))
    ) {
        for (const oracle of json.oracles || []) {
            oracle.serviceClass = parseIdentifier(oracle.serviceClass)
        }

        // normalize json
        for (const device of json.devices) {
            device.productIdentifier = parseIdentifier(device.productIdentifier)
            if (device.services) {
                for (const service of device.services) {
                    if (service.name) {
                        const spec = serviceSpecificationFromName(service.name)
                        if (!spec) {
                            console.log(`unknown service ${service.name}`)
                            return undefined
                        }
                        service.serviceClass = spec.classIdentifier
                    }
                    service.serviceClass = parseIdentifier(service.serviceClass)
                    if (!service.serviceClass) return undefined
                }
            }
        }

        return json
    }

    return undefined
}

export function createDeviceTest(
    bus: JDBus,
    device: DeviceTestSpec,
    panel?: PanelTestSpec
): DeviceTest {
    const { deviceCatalog } = bus
    const { productIdentifier, firmwareVersion } = device
    const specification =
        deviceCatalog.specificationFromProductIdentifier(productIdentifier)
    const deviceTest = new DeviceTest(productIdentifier, specification)

    // add status light
    deviceTest.appendChild(new StatusLightTest())

    // add test for control
    if (firmwareVersion) {
        const controlTest = new ServiceTest("control", SRV_CONTROL)
        controlTest.appendChild(
            new RegisterTest(
                `firmware version is ${firmwareVersion}`,
                ControlReg.FirmwareVersion,
                (node, logger) => {
                    const { register } = node
                    const ok = register?.stringValue === firmwareVersion
                    if (!ok)
                        logger(
                            `incorrect firmware version, expected ${firmwareVersion}`
                        )
                    return ok ? TestState.Pass : TestState.Fail
                }
            )
        )
        deviceTest.appendChild(controlTest)
    }

    const services: ServiceTestSpec[] =
        device.services ||
        specification.services.map(srv => ({ serviceClass: srv }))

    for (const service of services) {
        const { serviceClass, count = 1, disableBuiltinRules } = service
        const serviceOracle = panel?.oracles?.find(
            oracle => oracle.serviceClass === serviceClass
        )
        const specification =
            serviceSpecificationFromClassIdentifier(serviceClass)
        for (let i = 0; i < count; ++i) {
            const serviceTest = new ServiceTest(
                specification?.shortName.toLowerCase() ||
                    `0x${serviceClass.toString(16)}`,
                serviceClass
            )
            {
                // add status code
                serviceTest.appendChild(
                    new RegisterTest(
                        "status code should be ready or sleeping",
                        BaseReg.StatusCode,
                        (node, logger) => {
                            const { register } = node
                            const { unpackedValue = [] } = register
                            if (!unpackedValue.length) return TestState.Pass // not implemented
                            const [code, vendorCode] = unpackedValue
                            const ok =
                                (code === SystemStatusCodes.Ready ||
                                    code === SystemStatusCodes.Sleeping) &&
                                vendorCode === 0
                            if (!ok)
                                logger(
                                    `expected status code equals to 0x0,0x0 or 0x3,0x0`
                                )
                            return ok ? TestState.Pass : TestState.Fail
                        }
                    )
                )

                // reading value rule if any
                const readingSpec = specification?.packets?.find(isReading)
                if (readingSpec)
                    serviceTest.appendChild(
                        new RegisterTest(
                            "reading should stream",
                            readingSpec.identifier,
                            node => {
                                const { register } = node
                                const { unpackedValue = [] } = register
                                return unpackedValue?.length > 0
                                    ? TestState.Pass
                                    : TestState.Fail
                            }
                        )
                    )

                // add oracle
                if (serviceOracle)
                    serviceTest.appendChild(
                        new RegisterTest(
                            "reading near oracle",
                            SystemReg.Reading,
                            createOracleRule(serviceOracle)
                        )
                    )

                // import additional test nodes
                const testNodes = [
                    ...((!disableBuiltinRules &&
                        builtinTestRules[serviceClass]) ||
                        []),
                    ...(service.rules || []),
                ]
                    .map(rule => compileTestRule(specification, rule))
                    .filter(r => !!r)
                testNodes?.forEach(testRule =>
                    serviceTest.appendChild(testRule)
                )

                // import member tests
                const testCommand = builtinServiceCommandTests[serviceClass]
                if (testCommand)
                    serviceTest.appendChild(new ServiceCommandTest(testCommand))
            }
            deviceTest.appendChild(serviceTest)
        }
    }
    return deviceTest
}

export function createPanelTest(bus: JDBus, panel: PanelTestSpec) {
    const { id, devices = [], oracles = [] } = panel
    const panelTest = new PanelTest(id, panel)

    // add oracles
    for (const oracle of oracles) {
        const { serviceClass, deviceId, serviceIndex, tolerance } = oracle
        const oracleNode = new RegisterOracle(
            `oracle for ${serviceName(serviceClass)}`,
            deviceId,
            serviceIndex,
            serviceClass,
            tolerance
        )
        panelTest.appendChild(oracleNode)
    }

    // add devices
    for (const device of devices) {
        const { count = 1 } = device
        for (let i = 0; i < count; ++i) {
            const deviceTest = createDeviceTest(bus, device, panel)
            panelTest.appendChild(deviceTest)
        }
    }
    return panelTest
}
