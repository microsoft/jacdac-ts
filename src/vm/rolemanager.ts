import { JDEventSource } from "../jdom/eventsource"
import { DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "../jdom/constants"
import { JDBus } from "../jdom/bus"
import { JDDevice } from "../jdom/device"
import { JDService } from "../jdom/service"
import { serviceSpecificationFromName } from "../jdom/spec"
import {
    addServiceProvider,
    serviceProviderDefinitionFromServiceClass,
} from "../../src/servers/servers"
import { SMap } from "../jdom/utils"

export class MyRoleManager extends JDEventSource {
    private _roles: SMap<JDService | string> = {}
    private _devices: JDDevice[] = []

    constructor(
        private readonly bus: JDBus,
        private readonly notify: (
            role: string,
            service: JDService,
            added: boolean
        ) => void
    ) {
        super()
        this.bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) => this.addServices(dev))
        this.bus.on(DEVICE_DISCONNECT, (dev: JDDevice) =>
            this.removeServices(dev)
        )
    }

    private addServices(dev: JDDevice) {
        dev.services().forEach(s => {
            let key = Object.keys(this._roles).find(
                k =>
                    typeof this._roles[k] === "string" &&
                    this.nameMatch(
                        this._roles[k] as string,
                        s.specification.shortName
                    )
            )
            if (key && this._devices.indexOf(dev) === -1) {
                this._roles[key] = s
                this._devices.push(dev)
                if (this.notify) this.notify(key, s, true)
            }
        })
    }

    private removeServices(dev: JDDevice) {
        if (this._devices.indexOf(dev) >= 0) {
            this._devices = this._devices.filter(d => d !== dev)
            let key = Object.keys(this._roles).find(
                k =>
                    typeof this._roles[k] !== "string" &&
                    dev.services().indexOf(this._roles[k] as JDService) >= 0
            )
            if (key) {
                let service = this._roles[key] as JDService
                this._roles[key] = (this._roles[
                    key
                ] as JDService).specification.shortName
                if (this.notify) this.notify(key, service, false)
            }
        }
    }

    public getService(role: string): JDService {
        let s = this._roles[role]
        return !s || typeof s === "string" ? undefined : s
    }

    private nameMatch(n1: string, n2: string) {
        const cn1 = n1.slice(0).toLowerCase().replace("_", " ").trim()
        const cn2 = n2.slice(0).toLowerCase().replace("_", " ").trim()
        return cn1 === cn2
    }

    private getServicesFromName(root: string): JDService[] {
        return this.bus
            .services()
            .filter(s => this.nameMatch(s.specification.shortName, root))
    }

    public addRoleService(role: string, serviceShortName: string) {
        const s = this._roles[role]
        if (s && typeof(s) !== "string") 
            return
        let existingInstance = Object.values(this._roles).find(
            r =>
                (typeof r === "string" &&
                    this.nameMatch(r, serviceShortName)) ||
                (typeof r === "object" &&
                    this.nameMatch(r.specification.shortName, serviceShortName))
        )
        this._roles[role] = serviceShortName
        let ret = this.getServicesFromName(serviceShortName)
        if (existingInstance || ret.length === 0) {
            // spin up a new simulator
            let service = serviceSpecificationFromName(serviceShortName)
            let provider = serviceProviderDefinitionFromServiceClass(
                service.classIdentifier
            )
            addServiceProvider(this.bus, provider)
        } else {
            this._roles[role] = ret[0]
        }
    }
}
