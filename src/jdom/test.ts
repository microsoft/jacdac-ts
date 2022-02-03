import { randomBytes } from "crypto";
import { execPath } from "process";
import { BaseReg, CHANGE } from "./constants";
import { JDDevice } from "./device";
import { JDEventSource } from "./eventsource";
import { JDNode } from "./node";
import { randomDeviceId } from "./random";
import { JDRegister } from "./register";
import { JDService } from "./service";
import { serviceSpecificationFromClassIdentifier } from "./spec";

export enum TestState {
    Indeterminate,
    Running,
    Pass,
    Fail
}

export abstract class TestNode extends JDNode {
    private _id: string = randomDeviceId()
    private _parent: TestNode;
    private _state: TestState = TestState.Indeterminate
    private _children: TestNode[] = [];

    constructor(readonly _name: string) {
        super()
    }
    get id() {
        return this._id;
    }
    get parent() {
        return this._parent;
    }
    private set parent(value: TestNode) {
        if (value !== this._parent) {
            this._parent = value;
            this.emit(CHANGE)
        }
    }
    get children(): JDNode[] {
        return this._children.slice(0);
    }
    appendChild(node: TestNode) {
        if(node && this._children.indexOf(node) < 0) {
            this._children.push(node)
            node.parent = this
            this.emit(CHANGE);
        }
    }
    get name() {
        return this._name;
    }
    get qualifiedName(): string {
        return this._parent ? `${this.parent.id}:${this.name}` : this.name;
    }
    get state() {
        return this._state
    }
    set state(value: TestState) {
        if (value != this._state) {
            this._state = value;
            this.emitPropagated(CHANGE)
        }
    }
    get nodeKind(): string {
        return "test"
    }
}

export class PanelTest extends TestNode {
    constructor(id: string) {
        super(id || "panel")
    }
}

export class DeviceTest extends TestNode {
    private _device: JDDevice

    constructor(name: string) {
        super(name)
    }

    get device() {
        return this._device
    }
    set device(value: JDDevice) {
        if (value !== this._device) {
            this._device = value;
            this.emit(CHANGE);
        }
    }
}

export class ServiceTest extends TestNode {
    private _service: JDService

    constructor(name: string, readonly serviceClass: number) {
        super(name)
    }

    get service() {
        return this._service
    }
    set service(value: JDService) {
        if (value !== this._service) {
            this._service = value;
            this.state = TestState.Indeterminate
            this.emit(CHANGE);
        }
    }
}

export class RegisterTest extends TestNode {
    private _register: JDRegister

    constructor(name: string, readonly code: number) {
        super(name)
    }
    get register() {
        return this._register
    }
    set register(value: JDRegister) {
        if (value !== this._register) {
            this._register = value;
            this.state = TestState.Indeterminate
        }
    }
}

export function createPanelTest(panel: {
    id: string
    devices: {
        id: string,
        services: number[]
    }[]
}) {
    const { id, devices} = panel    
    const panelTest = new PanelTest(id)
    for(const device of devices) {
        const deviceTest = new DeviceTest(device.id)
        for(const service of device.services) {
            const specification = serviceSpecificationFromClassIdentifier(service)
            const serviceTest = new ServiceTest(specification.name, service)
            {
                const statusCodeTest = new RegisterTest(
                    "status code is ready", 
                    BaseReg.StatusCode)
                serviceTest.appendChild(statusCodeTest)
            }
            deviceTest.appendChild(serviceTest)
        }
        panelTest.appendChild(deviceTest)
    }
    return panelTest
}