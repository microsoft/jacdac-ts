import { JDBus } from "../jdom/bus"
import {
    BaseReg,
    ControlReg,
    SRV_CONTROL,
    SystemReg,
    SystemStatusCodes,
} from "../jdom/constants"
import { prettyDuration, serviceName } from "../jdom/pretty"
import {
    isEvent,
    isReading,
    isRegister,
    serviceSpecificationFromClassIdentifier,
    serviceSpecificationFromName,
} from "../jdom/spec"
import { delay, JSONTryParse, parseIdentifier } from "../jdom/utils"
import {
    DeviceTest,
    EventTest,
    PanelTest,
    RegisterOracle,
    RegisterTest,
    ServiceCommandTest,
    ServiceTest,
    StatusLightTest,
    TestLogger,
    TestNode,
} from "./nodes"
import {
    DeviceTestSpec,
    EventTestRule,
    OracleTestSpec,
    PanelTestSpec,
    ReadingTestRule,
    ServiceTestRule,
    ServiceTestSpec,
    SetIntensityAndValueTestRule,
    TestState,
} from "./spec"
import { resolveServiceCommandTest, resolveTestRules } from "./testrules"

function createSetIntensityAndValueRule(
    rule: SetIntensityAndValueTestRule
): TestNode {
    const { name: ruleName, steps } = rule
    const name =
        ruleName ||
        `set intensity, value to ${steps
            .map(
                ({ duration, intensity, value }) =>
                    `${prettyDuration(duration)}: ${
                        intensity !== undefined ? `i:${intensity}, ` : ""
                    }${value !== undefined ? `v:${value}}` : ""}`
            )
            .join(", ")}`
    return new ServiceCommandTest({
        name,
        start: test => {
            let mounted = true
            const work = async () => {
                const service = test.service
                const intensityRegister = service.intensityRegister
                const valueRegister = service.valueRegister
                let k = 0
                while (mounted) {
                    const step = steps[k++ % steps.length]
                    const { duration, intensity, value } = step

                    if (intensity !== undefined)
                        await intensityRegister.sendSetPackedAsync(
                            [intensity],
                            true
                        )
                    if (value !== undefined)
                        await valueRegister.sendSetPackedAsync([value], true)

                    await delay(duration)

                    if (k > steps.length) test.state = TestState.Pass
                }
            }
            work()
            return () => {
                mounted = false
            }
        },
    })
}

function createReadingRule(
    rule: ReadingTestRule
): (node: RegisterTest, logger: TestLogger) => TestState {
    const { value, tolerance, samples = 1, type, op } = rule
    const tol = isNaN(tolerance) || tolerance <= 0 ? 0 : tolerance
    const opf = {
        "==": (a: number, b: number, tol: number) => Math.abs(a - b) <= tol,
        "<": (a: number, b: number, tol: number) => a < b + tol,
        ">": (a: number, b: number, tol: number) => a > b - tol,
    }[op || "=="]
    let count = 0
    let seen = count >= samples
    return (node, logger) => {
        if (!seen) {
            const { register } = node
            const [current] = register.unpackedValue
            const active = current !== undefined && opf(current, value, tol)
            if (active) count++
            else count = 0
            // recompute
            seen = count >= samples
        }
        if (!seen) logger(`missing or incorrect ${type} value`)
        else logger(`${type} value seen`)
        return seen ? TestState.Pass : TestState.Running
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
        return event?.count > 0 ? TestState.Pass : TestState.Running
    }
}

function createOracleRule(
    oracle: OracleTestSpec
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

function createReadingTest(
    specification: jdspec.ServiceSpec,
    readingRule: ReadingTestRule
) {
    const { type, name, value, tolerance, manualSteps, op = "==" } = readingRule
    const registerId =
        type === "reading"
            ? SystemReg.Reading
            : type === "intensity"
            ? SystemReg.Intensity
            : SystemReg.Value
    const registerSpec = specification.packets.find(
        pkt => isRegister(pkt) && pkt.identifier === registerId
    )
    return new RegisterTest(
        name ||
            `observe ${registerSpec.name} ${op} ${value}${
                tolerance ? ` +/-${tolerance}` : ""
            }`,
        manualSteps,
        registerId,
        createReadingRule(readingRule)
    )
}

function createEventTest(
    specification: jdspec.ServiceSpec,
    eventRule: EventTestRule
) {
    const { name, eventName, manualSteps } = eventRule
    const pkt = specification.packets.find(
        pkt => isEvent(pkt) && pkt.name === eventName
    )
    return new EventTest(
        name || `raise event ${eventName}`,
        manualSteps,
        pkt.identifier,
        createEventRule(eventRule)
    )
}

function compileTestRule(
    specification: jdspec.ServiceSpec,
    rule: ServiceTestRule
): TestNode {
    const { type } = rule
    switch (type) {
        case "setIntensityAndValue":
            return createSetIntensityAndValueRule(
                rule as SetIntensityAndValueTestRule
            )
        case "value":
        case "intensity":
        case "reading":
            return createReadingTest(specification, rule as ReadingTestRule)
        case "event":
            return createEventTest(specification, rule as EventTestRule)
        default:
            return undefined
    }
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

function createStatusCodeTest() {
    return new RegisterTest(
        "status code should be ready, sleeping or not implemented",
        undefined,
        BaseReg.StatusCode,
        (node, logger) => {
            const { register } = node
            const { unpackedValue = [] } = register
            if (register.notImplemented || !unpackedValue.length) {
                logger(`not implemented`)
                return TestState.Pass
            }
            const [code, vendorCode] = unpackedValue
            if (vendorCode !== 0) {
                logger(`vendor code in error mode`)
                return TestState.Fail
            }
            if (code === SystemStatusCodes.Initializing) {
                logger(`initializing...`)
                return TestState.Running
            } else if (code === SystemStatusCodes.Calibrating) {
                logger(`calibrating...`)
                return TestState.Running
            }
            const ok =
                code === SystemStatusCodes.Ready ||
                code === SystemStatusCodes.Sleeping
            if (ok) return TestState.Pass

            logger(`expected status code equals to 0x0,0x0 or 0x3,0x0`)
            return TestState.Fail
        }
    )
}

export function createDeviceTest(
    bus: JDBus,
    device: DeviceTestSpec,
    panel?: PanelTestSpec
): DeviceTest {
    const { deviceCatalog } = bus
    const { productIdentifier, firmwareVersion, factory } = device
    const specification =
        deviceCatalog.specificationFromProductIdentifier(productIdentifier)
    const deviceTest = new DeviceTest(productIdentifier, specification, device)

    // add status light
    deviceTest.appendChild(new StatusLightTest())

    // add test for control
    const controlTest = new ServiceTest("control", SRV_CONTROL)
    controlTest.appendChild(createStatusCodeTest())
    if (firmwareVersion) {
        controlTest.appendChild(
            new RegisterTest(
                `firmware version is ${firmwareVersion}`,
                undefined,
                ControlReg.FirmwareVersion,
                (node, logger) => {
                    const { register } = node
                    const value = register?.stringValue
                    const ok = value === firmwareVersion
                    if (value && !ok)
                        logger(
                            `incorrect firmware version, expected ${firmwareVersion}`
                        )
                    return ok
                        ? TestState.Pass
                        : value
                        ? TestState.Fail
                        : TestState.Running
                }
            )
        )
    }
    deviceTest.appendChild(controlTest)

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
                serviceTest.appendChild(createStatusCodeTest())

                const packets = specification?.packets
                // reading value rule if any
                const readingSpec = packets?.find(isReading)
                if (readingSpec)
                    serviceTest.appendChild(
                        new RegisterTest(
                            `${readingSpec.name} data should stream`,
                            undefined,
                            readingSpec.identifier,
                            node => {
                                const { register } = node
                                const { unpackedValue = [] } = register
                                return unpackedValue?.length > 0
                                    ? TestState.Pass
                                    : TestState.Running
                            }
                        )
                    )
                // add oracle
                if (readingSpec && serviceOracle)
                    serviceTest.appendChild(
                        new RegisterTest(
                            `${readingSpec.name} near oracle`,
                            undefined,
                            SystemReg.Reading,
                            createOracleRule(serviceOracle)
                        )
                    )

                // read values of all mandatory registers
                packets
                    ?.filter(
                        p =>
                            !p.optional &&
                            !p.client &&
                            isRegister(p) &&
                            !isReading(p) &&
                            p.identifier !== SystemReg.StreamingInterval &&
                            p.identifier !== SystemReg.StreamingSamples
                    )
                    ?.map(
                        p =>
                            new RegisterTest(
                                `${p.name} has value`,
                                undefined,
                                p.identifier,
                                node => {
                                    const { register } = node
                                    const { unpackedValue = [] } = register
                                    if (unpackedValue?.length > 0)
                                        return TestState.Pass
                                    register.scheduleRefresh()
                                    return TestState.Running
                                }
                            )
                    )
                    ?.forEach(node => serviceTest.appendChild(node))

                // import additional test nodes
                const testNodes = [
                    ...((!disableBuiltinRules &&
                        resolveTestRules(serviceClass)) ||
                        []),
                    ...(service.rules || []),
                ]
                    .filter(rule => !factory || rule.factory)
                    .map(rule => compileTestRule(specification, rule))
                    .filter(r => !!r)
                testNodes?.forEach(testRule =>
                    serviceTest.appendChild(testRule)
                )

                // import member tests
                const testCommand = resolveServiceCommandTest(serviceClass)
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
