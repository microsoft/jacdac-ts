import { JDBus } from "./bus"
import {
    BaseReg,
    CHANGE,
    ControlReg,
    DISCONNECT,
    REPORT_UPDATE,
    SRV_CONTROL,
    SystemStatusCodes,
} from "./constants"
import { JDDevice } from "./device"
import { JDSubscriptionScope } from "./eventsource"
import { JDNode } from "./node"
import { randomDeviceId } from "./random"
import { JDRegister } from "./register"
import { JDService } from "./service"
import { isReading, serviceSpecificationFromClassIdentifier } from "./spec"
import { JSONTryParse } from "./utils"

export enum TestState {
    Pass,
    Indeterminate,
    Running,
    Fail,
}

export abstract class TestNode extends JDNode {
    private _id: string = randomDeviceId()
    private _name: string
    private _parent: TestNode
    private _state: TestState = TestState.Indeterminate
    private _error: string
    private _node: JDNode = undefined
    private _children: TestNode[] = []
    protected readonly subscriptions = new JDSubscriptionScope()

    constructor(name: string) {
        super()
        this._name = name
    }

    get name(): string {
        return this._name
    }

    protected set name(value: string) {
        if (value !== this._name) {
            this._name = value
            this.emit(CHANGE)
        }
    }

    get label(): string {
        return this._name
    }

    get id() {
        return this._id
    }
    get parent() {
        return this._parent
    }
    private set parent(value: TestNode) {
        if (value !== this._parent) {
            this.node = undefined
            this._parent = value
        }
    }
    get node(): JDNode {
        return this._node
    }
    set node(value: JDNode) {
        if (value !== this._node) {
            if (this._node) {
                console.log(`unbound ${this._node} from ${this}`)
            }
            this.unmount()
            this._node = value
            this.bindChildren()
            if (value) {
                console.log(`bound ${value} to ${this}`)
                this.mount()
                this.updateState()
            } else this.state = TestState.Indeterminate
        }
    }
    get error() {
        return this._error
    }

    private handleChange() {
        this.bindChildren()
        this.updateState()
    }

    private bindChildren() {
        if (this.node) this._children.forEach(c => this.bindChild(c))
        else this._children.forEach(c => (c.node = undefined))
    }

    protected updateState(): void {
        if (this._error) this.state = TestState.Fail
        else {
            // compute local state
            const state = this.nodeState()
            if (this.children.length === 0 || state === TestState.Fail)
                this.state = state
            // compute child states
            else this.state = this.computeChildrenState()
        }
    }

    protected nodeState(): TestState {
        return TestState.Indeterminate
    }

    protected mount() {
        this.subscriptions.mount(
            this.node.subscribe(CHANGE, this.handleChange.bind(this))
        )
    }

    protected unmount() {
        this.subscriptions.unmount()
        this._children.forEach(c => c.unmount())
    }

    get children(): TestNode[] {
        return this._children.slice(0)
    }

    appendChild(child: TestNode) {
        if (child && this._children.indexOf(child) < 0) {
            this._children.push(child)
            child.parent = this
            if (this.node) this.bindChild(child)
            else child.node = undefined
            this.emit(CHANGE)
            this.updateState()
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected bindChild(node: TestNode) {}

    get qualifiedName(): string {
        return this._parent ? `${this.parent}:${this.name}` : this.name
    }

    get state() {
        return this._state
    }
    set state(value: TestState) {
        if (value != this._state) {
            this._state = value
            this._error = undefined
            this.emit(CHANGE)
            this.parent?.updateState()
        }
    }
    setError(error: string) {
        if (this._error !== error) {
            this._error = error
            this.updateState()
        }
    }
    protected computeChildrenState() {
        return this._children.reduce(
            (s, c) => Math.max(s, c.state),
            TestState.Pass
        )
    }

    override toString(): string {
        return this.qualifiedName
    }
}

export const PANEL_TEST_KIND = "panelTest"
export const DEVICE_TEST_KIND = "deviceTest"
export const SERVICE_TEST_KIND = "serviceTest"
export const REGISTER_TEST_KIND = "registerTest"

export class PanelTest extends TestNode {
    constructor(id: string) {
        super(id || "panel")
    }
    get nodeKind(): string {
        return PANEL_TEST_KIND
    }
    get bus() {
        return this.node as JDBus
    }
    set bus(value: JDBus) {
        this.node = value
    }
    get deviceTests() {
        return this.children as DeviceTest[]
    }
    override bindChild(node: TestNode): void {
        const deviceTest = node as DeviceTest

        // clear bindings if needed
        if (deviceTest.device) {
            if (!deviceTest.device.connected) deviceTest.device = undefined
            // already bound
            else return
        }

        const deviceTests = this.deviceTests
        // list unbound devices on the bus
        const unboundDevices = this.bus
            .devices({ ignoreInfrastructure: true })
            // ignore devices that are already bound
            .filter(d => !deviceTests.some(t => t.device === d))
        // quadratic search, find first device that matches a test
        const device = unboundDevices.find(d => deviceTest.test(d))
        console.log(`binding device ${deviceTest}`, {
            deviceTest,
            deviceTests,
            unboundDevices,
            device,
        })
        deviceTest.device = device
    }

    override get label() {
        const children = this.children
        const found = children.filter(c => !!c.node).length
        return `${this.name}, found ${found}/${children.length} devices`
    }
}

export class DeviceTest extends TestNode {
    constructor(
        readonly productIdentifier: number,
        readonly specification: jdspec.DeviceSpec
    ) {
        super(specification?.name || `0x${productIdentifier.toString(16)}`)
    }
    get nodeKind(): string {
        return DEVICE_TEST_KIND
    }
    get device() {
        return this.node as JDDevice
    }
    set device(value: JDDevice) {
        this.node = value
    }

    get serviceTests() {
        return this.children.filter(
            child => child.nodeKind === SERVICE_TEST_KIND
        ) as ServiceTest[]
    }

    test(device: JDDevice): boolean {
        return this.productIdentifier === device.productIdentifier
    }

    protected mount(): void {
        super.mount()
        const device = this.device
        this.subscriptions.mount(
            device.subscribe(DISCONNECT, () => {
                if (device === this.node) this.node = undefined
            })
        )
    }

    override bindChild(node: TestNode): void {
        const serviceTest = node as ServiceTest
        if (serviceTest.service) return
        const serviceTests = this.serviceTests
        const unboundServices = this.device
            .services({
                serviceClass: serviceTest.serviceClass,
            })
            .filter(srv => !serviceTests.find(st => st.node === srv))
        const service = unboundServices.find(srv => serviceTest.test(srv))
        console.log(`binding service ${serviceTest}`, {
            serviceTest,
            serviceTests,
            unboundServices,
            service,
        })
        serviceTest.service = service
    }
}

export class ServiceTest extends TestNode {
    constructor(name: string, readonly serviceClass: number) {
        super(name)
    }
    get nodeKind(): string {
        return SERVICE_TEST_KIND
    }
    get service() {
        return this.node as JDService
    }
    set service(value: JDService) {
        this.node = value
    }

    test(service: JDService) {
        return service.serviceClass === this.serviceClass
    }

    override bindChild(node: TestNode): void {
        const registerTest = node as RegisterTest
        if (registerTest.register) return

        const register = this.service.register(registerTest.code)
        console.log(`binding register ${registerTest}`, {
            registerTest,
            register,
        })
        registerTest.register = register
    }
}

export class RegisterTest extends TestNode {
    constructor(
        name: string,
        readonly code: number,
        readonly computeState: (reg: JDRegister) => TestState
    ) {
        super(name)
    }
    get nodeKind(): string {
        return REGISTER_TEST_KIND
    }
    get register() {
        return this.node as JDRegister
    }
    set register(value: JDRegister) {
        this.node = value
    }

    override mount() {
        super.mount()
        const register = this.register
        console.log(`register subscribe ${this.code} to ${register}`)
        this.subscriptions.mount(
            register.subscribe(REPORT_UPDATE, () => {
                console.log(`register update ${register}`, {
                    values: register?.unpackedValue,
                })
                this.updateState()
            })
        )
    }

    override nodeState(): TestState {
        const register = this.register
        if (register) {
            try {
                return this.computeState(this.register)
            } catch (e) {
                return TestState.Fail
            }
        } else return TestState.Indeterminate
    }
}

export interface PanelTestSpec {
    id: string
    devices: PanelDeviceTestSpec[]
}

export interface PanelDeviceTestSpec {
    productIdentifier: number
    count: number
    firmwareVersion?: string
    services: PanelServiceTestSpec[]
}

export interface PanelServiceTestSpec {
    serviceClass: number
    count?: number
}

export function tryParsePanelTestSpec(source: string) {
    const json = JSONTryParse(source) as PanelTestSpec
    if (
        json?.id &&
        json.devices &&
        Array.isArray(json.devices) &&
        json.devices.every(
            d =>
                !!d.productIdentifier &&
                !!d.services &&
                Array.isArray(d.services) &&
                d.services.every(srv => !!srv.serviceClass) &&
                d.count > 0
        )
    )
        return json

    return undefined
}

export function createPanelTest(bus: JDBus, panel: PanelTestSpec) {
    const { id, devices } = panel
    const { deviceCatalog } = bus
    const panelTest = new PanelTest(id)
    panelTest.bus = bus
    for (const device of devices) {
        const { productIdentifier, firmwareVersion, count } = device
        for (let i = 0; i < count; ++i) {
            const specification =
                deviceCatalog.specificationFromProductIdentifier(
                    productIdentifier
                )
            const deviceTest = new DeviceTest(productIdentifier, specification)

            // add test for control
            if (firmwareVersion) {
                const controlTest = new ServiceTest("control", SRV_CONTROL)
                controlTest.appendChild(
                    new RegisterTest(
                        `firmware version is ${firmwareVersion}`,
                        ControlReg.FirmwareVersion,
                        reg =>
                            reg.stringValue === firmwareVersion
                                ? TestState.Pass
                                : TestState.Fail
                    )
                )
                deviceTest.appendChild(controlTest)
            }

            for (const service of device.services) {
                const { serviceClass, count = 1 } = service
                const specification =
                    serviceSpecificationFromClassIdentifier(serviceClass)
                for (let i = 0; i < count; ++i) {
                    const serviceTest = new ServiceTest(
                        specification.shortName.toLowerCase(),
                        serviceClass
                    )
                    {
                        serviceTest.appendChild(
                            new RegisterTest(
                                "status code should be ready",
                                BaseReg.StatusCode,
                                reg => {
                                    const [code, vendorCode] = reg.unpackedValue
                                    return code === SystemStatusCodes.Ready &&
                                        vendorCode === 0
                                        ? TestState.Pass
                                        : TestState.Fail
                                }
                            )
                        )

                        const readingSpec =
                            specification.packets.find(isReading)
                        if (readingSpec)
                            serviceTest.appendChild(
                                new RegisterTest(
                                    "reading register should stream",
                                    readingSpec.identifier,
                                    reg =>
                                        reg.unpackedValue.length > 0
                                            ? TestState.Pass
                                            : TestState.Fail
                                )
                            )
                    }
                    deviceTest.appendChild(serviceTest)
                }
            }
            panelTest.appendChild(deviceTest)
        }
    }
    return panelTest
}
