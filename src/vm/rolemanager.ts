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
    private _roles: SMap<[string, JDService]> = {}
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

    roles() {
        return this._roles
    }

    private addServices(dev: JDDevice) {
        dev.services().forEach(s => {
            let role = Object.keys(this._roles).find(
                k =>
                    this.nameMatch(
                        this._roles[k][0],
                        s.specification.shortName
                    )
            )
            if (role && this._devices.indexOf(dev) === -1) {
                this._roles[role] = [role,s]
                this._devices.push(dev)
                if (this.notify) this.notify(role, s, true)
            }
        })
    }

    private removeServices(dev: JDDevice) {
        if (this._devices.indexOf(dev) >= 0) {
            this._devices = this._devices.filter(d => d !== dev)
            let role = Object.keys(this._roles).find(
                k => dev.services().indexOf(this._roles[k][1]) >= 0
            )
            if (role) {
                let service = this._roles[role][1]
                this._roles[role] = [service.specification.shortName,undefined]
                if (this.notify) this.notify(role, service, false)
            }
        }
    }

    public getService(role: string): JDService {
        return this._roles[role][1]
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
        if (role in this._roles && this._roles[role][1]) return
        this._roles[role] = [ serviceShortName, undefined]
        let existingServices = Object.values(this._roles).filter(p => p[1]).map(p => p[1])
        let ret = this.getServicesFromName(serviceShortName).filter(s => existingServices.indexOf(s) === -1)
        if (ret.length > 0) {
            this._roles[role][1] = ret[0]
            this.notify(role, ret[0], true)
        } else {
            // spin up a new simulator
            // let service = serviceSpecificationFromName(serviceShortName)
            // if (service) {
            //     let provider = serviceProviderDefinitionFromServiceClass(
            //         service?.classIdentifier
            //     )
            //     if (provider) {
            //         let serviceProvider = addServiceProvider(this.bus, provider)
            //     }
            // }
        }
    }
}
