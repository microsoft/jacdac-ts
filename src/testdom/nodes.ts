import { JDBus } from "../jdom/bus"
import {
    CHANGE,
    DEVICE_ANNOUNCE,
    DISCONNECT,
    EVENT,
    REPORT_UPDATE,
    SystemReg,
    STATE_CHANGE,
} from "../jdom/constants"
import { JDDevice } from "../jdom/device"
import { JDEvent } from "../jdom/event"
import { JDSubscriptionScope } from "../jdom/eventsource"
import { JDNode } from "../jdom/node"
import { randomDeviceId } from "../jdom/random"
import { JDRegister } from "../jdom/register"
import { JDService } from "../jdom/service"
import { arrayConcatMany, delay } from "../jdom/utils"
import {
    DeviceTestSpec,
    ManualSteps,
    PanelTestSpec,
    TestResult,
    TestState,
} from "./spec"

export const PANEL_TEST_KIND = "panelTest"
export const DEVICE_TEST_KIND = "deviceTest"
export const STATUS_LIGHT_TEST_KIND = "statusLightTestKind"
export const SERVICE_TEST_KIND = "serviceTest"
export const SERVICE_COMMAND_TEST_KIND = "serviceCommandTest"
export const REGISTER_TEST_KIND = "registerTest"
export const EVENT_TEST_KIND = "eventTest"
export const REGISTER_ORACLE_KIND = "registerOracle"

export type TestLogger = (msg: string) => void

export abstract class TestNode extends JDNode {
    private readonly _id: string = randomDeviceId()
    private _parent: TestNode
    private _state: TestState = TestState.Indeterminate
    private _output: string
    private _node: JDNode = undefined
    private _children: TestNode[] = []
    protected readonly subscriptions = new JDSubscriptionScope()

    constructor(
        private _name: string,
        private _manualSteps: ManualSteps = undefined
    ) {
        super()
    }

    get manualSteps() {
        return this._manualSteps
    }

    get description(): string {
        return ""
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

    get info(): string {
        return undefined
    }

    get factory(): boolean {
        return this.parent?.factory
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
                //console.log(`unbound ${this._node} from ${this}`)
            }
            this.unmount()
            this._node = value
            this.bindChildren()
            if (value) {
                //console.log(`bound ${value} to ${this}`)
                this.mount()
                this.updateState()
            } else this.state = TestState.Indeterminate
        }
    }

    private handleChange() {
        this.bindChildren()
        this.updateState()
    }

    private bindChildren() {
        if (this.node) this._children.forEach(c => c.bind())
        else this._children.forEach(c => (c.node = undefined))
    }

    protected updateState(): void {
        const { prepare } = this.manualSteps || {}
        if (
            prepare &&
            !this.factory &&
            (this.state == TestState.Indeterminate ||
                this.state == TestState.Fail)
        )
            return

        // compute local state
        const { state, output } = this.nodeState()
        if (output !== undefined) this.output = output
        if (this.children.length === 0 || state === TestState.Fail)
            this.state = state
        // compute child states
        else this.state = this.computeChildrenState()
    }

    prepared() {
        this.state = TestState.Running
        this.updateState()
        if (this.state != <any>TestState.Pass) this.state = TestState.Fail
    }

    resolveOracle(reg: JDRegister): RegisterOracle {
        return this.parent?.resolveOracle(reg)
    }

    protected nodeState(): TestResult {
        return {
            state: this.node ? TestState.Running : TestState.Indeterminate,
        }
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

    get descendants(): TestNode[] {
        return [
            ...this._children,
            ...arrayConcatMany(this._children.map(child => child.descendants)),
        ]
    }

    appendChild(child: TestNode) {
        if (child && this._children.indexOf(child) < 0) {
            this._children.push(child)
            child.parent = this
            if (this.node) child.bind()
            else child.node = undefined
            this.emit(CHANGE)
            this.updateState()
        }
    }

    protected bind() {}

    get qualifiedName(): string {
        return this._parent ? `${this.parent}:${this.name}` : this.name
    }

    get state() {
        return this._state
    }
    set state(value: TestState) {
        if (value != this._state) {
            this._state = value
            this.emit(CHANGE)
            this.emit(STATE_CHANGE)
            this.parent?.updateState()
        }
    }

    get output() {
        return this._output
    }

    set output(value: string) {
        if (this._output !== value) {
            this._output = value
            this.emit(CHANGE)
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

    export(): object {
        const children = this.children.map(child => child.export())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = {
            name: this.name,
            state: TestState[this.state]?.toLowerCase(),
            kind: this.nodeKind,
            ...this.customProperties(),
        }
        if (this.output) res.output = this.output
        if (children.length > 0) res.children = children
        return res
    }

    protected customProperties(): object {
        return {}
    }
}

export class PanelTest extends TestNode {
    constructor(id: string, readonly specification: PanelTestSpec) {
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
    get factory() {
        return !!this.specification.factory
    }
    get deviceTests() {
        return this.children as DeviceTest[]
    }
    override resolveOracle(reg: JDRegister): RegisterOracle {
        return this.children
            .filter(c => c.nodeKind === REGISTER_ORACLE_KIND)
            .map<RegisterOracle>(c => <RegisterOracle>c)
            .filter(c => !!c.register)
            .find(
                (o: RegisterOracle) =>
                    o.serviceClass === reg.service.serviceClass &&
                    o.code === reg.code
            )
    }
    override get label() {
        const children = this.children.filter(
            c => c.nodeKind === DEVICE_TEST_KIND
        )
        const found = children.filter(c => !!c.node).length
        return `${this.name}, found ${found}/${children.length} devices`
    }

    override mount(): void {
        super.mount()
        this.subscriptions.mount(
            this.bus.subscribe(DEVICE_ANNOUNCE, (dev: JDDevice) => {
                dev.refreshFirmwareInfo()
            })
        )
    }

    override customProperties(): object {
        return {
            time: new Date().toUTCString(),
            userAgent: typeof navigator !== "undefined" && navigator?.userAgent,
        }
    }
}

export class DeviceTest extends TestNode {
    constructor(
        readonly productIdentifier: number,
        readonly specification: jdspec.DeviceSpec,
        readonly testSpecification: DeviceTestSpec
    ) {
        super(
            specification
                ? `${specification.name} (0x${productIdentifier.toString(16)})`
                : `0x${productIdentifier.toString(16)}`
        )
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
    get factory() {
        return this.parent?.factory || !!this.testSpecification.factory
    }
    get serviceTests() {
        return this.children.filter(
            child => child.nodeKind === SERVICE_TEST_KIND
        ) as ServiceTest[]
    }

    test(device: JDDevice): boolean {
        return this.productIdentifier === device.productIdentifier
    }

    bind(): void {
        // clear bindings if needed
        if (this.device) {
            if (!this.device.connected) this.device = undefined
            // already bound
            else return
        }

        if (!this.parent) return

        const { deviceTests, specification, bus } = this.parent as PanelTest
        const { oracles } = specification

        // list unbound devices on the bus
        const unboundDevices = bus
            .devices({ ignoreInfrastructure: true })
            // ignore devices that are already bound
            .filter(d => !deviceTests.some(t => t.device === d))
            // ignore oracles
            .filter(
                d => !oracles?.find(oracle => oracle.deviceId === d.deviceId)
            )
        // quadratic search, find first device that matches a test
        const device = unboundDevices.find(d => this.test(d))
        this.device = device
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

    protected customProperties(): object {
        const d = this.device
        if (!d) return {}
        return {
            deviceId: d.deviceId,
            shortId: d.shortId,
            firmwareVersion: d.firmwareVersion,
        }
    }
}

export class StatusLightTest extends TestNode {
    constructor() {
        super("status light")
    }
    get description(): string {
        return "slow green blink = pass, fast red blink = fail, medium blue blink = running"
    }
    get nodeKind(): string {
        return STATUS_LIGHT_TEST_KIND
    }
    get device(): JDDevice {
        return this.node as JDDevice
    }
    bind() {
        const { device } = (this.parent || {}) as DeviceTest
        this.node = device
    }
    override mount(): void {
        super.mount()
        const device = this.device
        const statusLight = device?.statusLight
        if (!statusLight) return

        let mounted = true
        const work = async () => {
            while (mounted && statusLight) {
                switch (this.parent.state) {
                    case TestState.Pass:
                        statusLight.blink(0x006000, 0x000000, 500, 1)
                        break
                    case TestState.Fail:
                        statusLight.blink(0x500000, 0x000000, 250, 4)
                        break
                }
                await delay(1000)
            }
        }
        work()
        this.subscriptions.mount(() => {
            mounted = false
        })
    }
    updateState() {
        this.state = TestState.Pass
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

    override bind(): void {
        if (this.service || !this.parent) return
        const { serviceTests, device } = this.parent as DeviceTest
        const unboundServices = device
            .services({
                serviceClass: this.serviceClass,
            })
            .filter(srv => !serviceTests.find(st => st.node === srv))
        const service = unboundServices.find(srv => this.test(srv))
        this.service = service
    }

    override customProperties(): object {
        const s = this.service
        if (!s) return {}
        return {
            serviceIndex: s.serviceIndex,
        }
    }
}

export abstract class ServiceMemberTestNode extends TestNode {
    constructor(name: string, manualSteps: ManualSteps) {
        super(name, manualSteps)
    }
    get service(): JDService {
        if (!this.parent) return undefined
        const { service } = this.parent as ServiceTest
        return service
    }
}

export interface ServiceMemberOptions {
    name: string
    manualSteps?: ManualSteps
    start: (test: ServiceMemberTestNode) => () => void
    hasChildren?: boolean
}

export class ServiceCommandTest extends ServiceMemberTestNode {
    constructor(readonly options: ServiceMemberOptions) {
        super(options.name, options.manualSteps)
    }
    get nodeKind(): string {
        return SERVICE_COMMAND_TEST_KIND
    }
    override updateState() {
        if (this.options?.hasChildren) super.updateState()
    }
    override mount(): void {
        super.mount()

        const service = this.service
        const { start } = this.options
        if (service) {
            const unsubscribe = start(this)
            this.subscriptions.mount(unsubscribe)
        }
    }
    override bind() {
        this.node = this.service
    }
}

export abstract class RegisterTestNode extends ServiceMemberTestNode {
    constructor(name: string, manualSteps: ManualSteps, readonly code: number) {
        super(name, manualSteps)
    }
    get register() {
        return this.node as JDRegister
    }
    set register(value: JDRegister) {
        this.node = value
    }

    get description(): string {
        const specification = this.register?.specification
        return specification?.description
    }

    override mount() {
        super.mount()
        const register = this.register
        //console.log(`register subscribe ${this.code} to ${register}`)
        this.subscriptions.mount(
            register.subscribe(REPORT_UPDATE, () => {
                this.updateState()
                this.emit(CHANGE)
            })
        )
        this.updateState()
    }
    override get info(): string {
        return this.register?.humanValue || "?"
    }
}

export class RegisterOracle extends RegisterTestNode {
    constructor(
        name: string,
        readonly deviceId: string,
        readonly serviceIndex: number,
        readonly serviceClass: number,
        readonly tolerance: number
    ) {
        super(name, undefined, SystemReg.Reading)
    }

    get nodeKind(): string {
        return REGISTER_ORACLE_KIND
    }

    override nodeState(): TestResult {
        return {
            state: this.register?.unpackedValue?.length
                ? TestState.Pass
                : TestState.Fail,
        }
    }

    override bind(): void {
        if (this.register || !this.parent) return

        const { bus } = this.parent as PanelTest
        const device = bus.device(this.deviceId, true)
        const service = device?.services({
            serviceIndex: this.serviceIndex,
            serviceClass: this.serviceClass,
        })[0]
        const register = service?.register(this.code)
        this.register = register
    }
}

export class RegisterTest extends RegisterTestNode {
    constructor(
        name: string,
        manualSteps: ManualSteps,
        code: number,
        readonly computeState: (
            node: RegisterTest,
            logger: TestLogger
        ) => TestState
    ) {
        super(name, manualSteps, code)
    }
    get nodeKind(): string {
        return REGISTER_TEST_KIND
    }

    override nodeState(): TestResult {
        const register = this.register
        const log: string[] = []
        const logger = (msg: string) => {
            msg && log.push(msg)
        }
        let state = TestState.Indeterminate
        if (register) {
            try {
                // always turn off color before querying service
                const statusLight = register.service?.device?.statusLight
                statusLight?.setColor(0)
                state = this.computeState(this, logger)
            } catch (e) {
                state = TestState.Fail
                logger(e?.toString())
            }
        }
        return {
            state,
            output: log?.length ? log.join("\n") : undefined,
        }
    }

    override bind(): void {
        const service = this.service
        const register = service?.register(this.code)
        this.register = register
    }
}

export class EventTest extends ServiceMemberTestNode {
    constructor(
        name: string,
        manualSteps: ManualSteps,
        readonly code: number,
        readonly computeState: (
            node: EventTest,
            logger: TestLogger
        ) => TestState
    ) {
        super(name, manualSteps)
    }
    get nodeKind(): string {
        return EVENT_TEST_KIND
    }
    get event() {
        return this.node as JDEvent
    }
    set event(value: JDEvent) {
        this.node = value
    }
    get description(): string {
        const specification = this.event?.specification
        return specification?.description
    }

    override mount() {
        super.mount()
        const event = this.event
        //console.log(`event subscribe ${this.code} to ${event}`)
        this.subscriptions.mount(
            event.subscribe(EVENT, () => {
                this.updateState()
                this.emit(CHANGE)
            })
        )
    }

    override nodeState(): TestResult {
        const event = this.event
        const log: string[] = []
        const logger = (msg: string) => {
            msg && log.push(msg)
        }
        let state = TestState.Indeterminate
        if (event) {
            try {
                state = this.computeState(this, logger)
            } catch (e) {
                state = TestState.Fail
                logger(e?.toString())
            }
        }
        return {
            state,
            output: log.join("\n"),
        }
    }

    override bind(): void {
        const service = this.service
        const event = service?.event(this.code)
        this.event = event
    }

    override get info(): string {
        const c = this.event?.count
        return c ? `#${c}` : "?"
    }
}
