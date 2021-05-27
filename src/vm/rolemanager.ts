import { JDEventSource } from "../jdom/eventsource"
import { DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "../jdom/constants"
import { JDBus } from "../jdom/bus"
import { JDDevice } from "../jdom/device"
import { JDService } from "../jdom/service"
import { SMap } from "../jdom/utils"

export class MyRoleManager extends JDEventSource {
    private _roles: SMap<{ shortName: string; service: JDService }> = {}
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
            let roleNeedingService = Object.keys(this._roles).find(
                k =>
                    !this._roles[k].service &&
                    this.nameMatch(
                        this._roles[k].shortName,
                        s.specification.shortName
                    )
            )
            if (roleNeedingService && this._devices.indexOf(dev) === -1) {
                this._roles[roleNeedingService] = {
                    shortName: s.specification.shortName,
                    service: s,
                }
                this._devices.push(dev)
                if (this.notify) this.notify(roleNeedingService, s, true)
            }
        })
    }

    private removeServices(dev: JDDevice) {
        if (this._devices.indexOf(dev) >= 0) {
            this._devices = this._devices.filter(d => d !== dev)
            let rolesToUnmap = Object.keys(this._roles).filter(
                k => dev.services().indexOf(this._roles[k].service) >= 0
            )
            if (rolesToUnmap.length > 0) {
                rolesToUnmap.forEach(role => {
                    let service = this._roles[role].service
                    this._roles[role] = {
                        shortName: service.specification.shortName,
                        service: undefined,
                    }
                    if (this.notify) this.notify(role, service, false)
                })
            }
        }
    }

    public getService(role: string): JDService {
        return this._roles[role].service
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

    public addRoleService(role: string, shortName: string) {
        if (role in this._roles && this._roles[role].service) return
        this._roles[role] = { shortName, service: undefined }
        const existingServices = Object.values(this._roles)
            .filter(p => p.service)
            .map(p => p.service)
        let ret = this.getServicesFromName(shortName).filter(
            s => existingServices.indexOf(s) === -1
        )
        if (ret.length > 0) {
            this._roles[role].service = ret[0]
            this._devices.push(ret[0].device)
            this.notify(role, ret[0], true)
        }
    }
}
