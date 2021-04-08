namespace jacdac._rolemgr {
    const roleSettingPrefix = "#jdr:"

    export function clearRoles() {
        settings.list(roleSettingPrefix).forEach(settings.remove)
    }

    export function getRole(devid: string, servIdx: number) {
        return settings.readString(roleSettingPrefix + devid + ":" + servIdx)
    }

    export function setRole(devid: string, servIdx: number, role: string) {
        const key = roleSettingPrefix + devid + ":" + servIdx
        if (role)
            settings.writeString(key, role)
        else
            settings.remove(key)
        Device.clearNameCache()
    }

    class DeviceWrapper {
        bindings: RoleBinding[] = []
        score = -1
        constructor(
            public device: Device
        ) { }
    }

    class RoleBinding {
        boundToDev: Device
        boundToServiceIdx: number

        constructor(
            public role: string,
            public serviceClass: number
        ) { }

        host() {
            const slashIdx = this.role.indexOf("/")
            if (slashIdx < 0) return this.role
            else return this.role.slice(0, slashIdx - 1)
        }

        select(devwrap: DeviceWrapper, serviceIdx: number) {
            const dev = devwrap.device
            if (dev == this.boundToDev && serviceIdx == this.boundToServiceIdx)
                return
            if (this.boundToDev)
                setRole(this.boundToDev.deviceId, this.boundToServiceIdx, null)
            devwrap.bindings[serviceIdx] = this
            setRole(dev.deviceId, serviceIdx, this.role)
            this.boundToDev = dev
            this.boundToServiceIdx = serviceIdx
        }
    }

    class ServerBindings {
        bindings: RoleBinding[] = []
        constructor(
            public host: string
        ) { }

        get fullyBound() {
            return this.bindings.every(b => b.boundToDev != null)
        }

        // candidate devices are ordered by [numBound, numPossible, device_id]
        // where numBound is number of clients already bound to this device
        // and numPossible is number of clients that can possibly be additionally bound
        scoreFor(devwrap: DeviceWrapper, select = false) {
            let numBound = 0
            let numPossible = 0
            const dev = devwrap.device
            const missing: RoleBinding[] = []
            for (const b of this.bindings) {
                if (b.boundToDev) {
                    if (b.boundToDev == dev)
                        numBound++
                } else {
                    missing.push(b)
                }
            }

            const sbuf = dev.services
            for (let idx = 4; idx < sbuf.length; idx += 4) {
                const serviceIndex = idx >> 2
                // if service is already bound to some client, move on
                if (devwrap.bindings[serviceIndex])
                    continue

                const serviceClass = sbuf.getNumber(NumberFormat.UInt32LE, idx)
                for (let i = 0; i < missing.length; ++i) {
                    if (missing[i].serviceClass == serviceClass) {
                        // we've got a match!
                        numPossible++ // this can be assigned
                        // in fact, assign if requested
                        if (select) {
                            control.dmesg("autobind: " + missing[i].role + " -> " + dev.shortId + ":" + serviceIndex)
                            missing[i].select(devwrap, serviceIndex)
                        }
                        // this one is no longer missing
                        missing.splice(i, 1)
                        // move on to the next service in announce
                        break
                    }
                }
            }

            // if nothing can be assigned, the score is zero
            if (numPossible == 0)
                return 0

            // otherwise the score is [numBound, numPossible], lexicographic
            // numPossible can't be larger than ~64, leave it a few more bits
            return (numBound << 8) | numPossible
        }
    }

    function maxIn<T>(arr: T[], cmp: (a: T, b: T) => number) {
        let maxElt = arr[0]
        for (let i = 1; i < arr.length; ++i) {
            if (cmp(maxElt, arr[i]) < 0)
                maxElt = arr[i]
        }
        return maxElt
    }

    export class RoleManagerServer extends Server {
        private _oldBindingsHash: number;

        constructor() {
            super("rolemgr", jacdac.SRV_ROLE_MANAGER)
        }

        public handlePacket(packet: JDPacket) {
            jacdac.autoBind = this.handleRegBool(packet, jacdac.RoleManagerReg.AutoBind, jacdac.autoBind)

            switch (packet.serviceCommand) {
                case jacdac.RoleManagerReg.AllRolesAllocated | CMD_GET_REG:
                    this.sendReport(JDPacket.jdpacked(jacdac.RoleManagerReg.AllRolesAllocated | CMD_GET_REG,
                        "u8", [_allClients.every(c => c.broadcast || !!c.device) ? 1 : 0]))
                    break
                case jacdac.RoleManagerCmd.GetRole:
                    if (packet.data.length == 9) {
                        const name = getRole(packet.data.slice(0, 8).toHex(), packet.data[8]) || ""
                        this.sendReport(JDPacket.from(jacdac.RoleManagerCmd.GetRole, packet.data.concat(Buffer.fromUTF8(name))))
                    }
                    break
                case jacdac.RoleManagerCmd.SetRole:
                    if (packet.data.length >= 9)
                        setRole(packet.data.slice(0, 8).toHex(), packet.data[8], packet.data.slice(9).toString())
                    break
                case jacdac.RoleManagerCmd.ListStoredRoles:
                    OutPipe.respondForEach(packet, settings.list(roleSettingPrefix), k => {
                        const name = settings.readString(k)
                        const len = roleSettingPrefix.length
                        return jdpack("b[8] u8 s", [
                            Buffer.fromHex(k.slice(len, len + 16)),
                            parseInt(k.slice(len + 16)),
                            name
                        ])
                    })
                    break
                case jacdac.RoleManagerCmd.ListRequiredRoles:
                    OutPipe.respondForEach(packet, _allClients, packName)
                    break
                case jacdac.RoleManagerCmd.ClearAllRoles:
                    clearRoles()
                    break
            }

            function packName(c: Client) {
                const devid = c.device ? Buffer.fromHex(c.device.deviceId) : Buffer.create(8)
                const servidx = c.device ? c.serviceIndex : 0
                return jdpack("b[8] u32 u8 s", [devid, c.serviceClass, servidx, c.role])
            }
        }

        private bindingHash() {
            let r = ""
            const n = _allClients.length
            for(let i = 0; i < n; ++i) {
                const client = _allClients[i];
                r += `${client.role || ""}:${client.broadcast || (client.device && client.device.deviceId) || ""}:${client.serviceIndex}`
            }
            const buf = Buffer.fromUTF8(r)
            return buf.hash(32);
        }

        checkProxy() {
            const now = control.micros()
            const self = jacdac.selfDevice();
            const devs = jacdac.devices().filter(d => d !== self && d.hasService(SRV_ROLE_MANAGER));
            if (!devs.length)
                return; // nothing to do here

            this.log(`check proxy self ${((now / 100000) | 0) / 10}s`)
            for(const device of devs) {
                const uptime = device.uptime;
                if (uptime === undefined) {
                    this.log(`check proxy ${device.shortId}: no uptime`)
                    device.sendCtrlCommand(CMD_GET_REG | ControlReg.Uptime);
                } else {
                    this.log(`check proxy ${device.shortId}: ${((uptime / 100000) | 0) / 10}s`)
                    if (now > uptime) {
                        this.log(`reset into proxy mode`)
                        settings.writeNumber(JACDAC_PROXY_SETTING, 1)
                        control.reset();
                    }
                }
            }
        }

        autoBind() {
            this.log(`autobind: devs=${_devices.length} clients=${_unattachedClients.length}`)
            if (_devices.length == 0 || _unattachedClients.length == 0) {
                this.checkChanges();
                return
            }

            const bindings: RoleBinding[] = []
            const wraps = _devices.map(d => new DeviceWrapper(d))

            for (const cl of _allClients) {
                if (!cl.broadcast && cl.role) {
                    const b = new RoleBinding(cl.role, cl.serviceClass)
                    if (cl.device) {
                        b.boundToDev = cl.device
                        b.boundToServiceIdx = cl.serviceIndex
                        for (const w of wraps)
                            if (w.device == cl.device) {
                                w.bindings[cl.serviceIndex] = b
                                break
                            }
                    }
                    bindings.push(b)
                }
            }

            let servers: ServerBindings[] = []

            // Group all clients by host
            for (const b of bindings) {
                const hn = b.host()
                let h = servers.find(h => h.host == hn)
                if (!h) {
                    h = new ServerBindings(hn)
                    servers.push(h)
                }
                h.bindings.push(b)
            }

            // exclude hosts that have already everything bound
            servers = servers.filter(h => !h.fullyBound)

            while (servers.length > 0) {
                // Get host with maximum number of clients (resolve ties by name)
                // This gives priority to assignment of "more complicated" hosts, which are generally more difficult to assign
                const h = maxIn(servers, (a, b) => a.bindings.length - b.bindings.length || b.host.compare(a.host))

                for (const d of wraps)
                    d.score = h.scoreFor(d)

                const dev = maxIn(wraps, (a, b) => a.score - b.score || b.device.deviceId.compare(a.device.deviceId))

                if (dev.score == 0) {
                    // nothing can be assigned, on any device
                    servers.removeElement(h)
                    continue
                }

                // assign services in order of names - this way foo/servo1 will be assigned before foo/servo2
                // in list of advertised services
                h.bindings.sort((a, b) => a.role.compare(b.role))

                // "recompute" score, assigning names in process
                h.scoreFor(dev, true)

                // if everything bound on this host, remove it from further consideration
                if (h.fullyBound)
                    servers.removeElement(h)
                else {
                    // otherwise, remove bindings on the current device, to update sort order
                    // it's unclear we need this
                    h.bindings = h.bindings.filter(b => b.boundToDev != dev.device)
                }
            }
            this.checkChanges();
        }

        private checkChanges() {
            // notify clients that something changed
            const newHash = this.bindingHash();
            if (this._oldBindingsHash !== newHash) {
                this._oldBindingsHash = newHash;
                this.log(`roles: bindings changed`)
                this.sendChangeEvent()
            } else {
                //console.log(`auto bind: no changes`)
            }
        }
    }
}

namespace jacdac {

    //% fixedInstance whenUsed block="role manager"
    export const roleManager = new _rolemgr.RoleManagerServer()

    /*

    function addRequested(devs: RoleBinding[], name: string, service_class: number,
        parent: RoleManagerClient) {
        let r = devs.find(d => d.role == name)
        if (!r)
            devs.push(r = new RoleBinding(parent, name))
        r.serviceClasses.push(service_class)
        return r
    }

    export class RoleManagerClient extends Client {
        public remoteRequestedDevices: RoleBinding[] = []

        constructor(role: string) {
            super("rolemgrc", SRV_ROLE_MANAGER, role)

            onNewDevice(() => {
                recomputeCandidates(this.remoteRequestedDevices)
            })

            onAnnounce(() => {
                if (this.isConnected())
                    control.runInParallel(() => this.scanCore())
            })
        }

        private scanCore() {
            const inp = new InPipe()
            this.sendCommand(inp.openCommand(RoleManagerCmd.ListRequiredRoles))

            const localDevs = devices()
            const devs: RoleBinding[] = []

            inp.readList(buf => {
                const [devidbuf, service_class, name] = jdunpack<[Buffer, number, string]>(buf, "b[8] u32 s")
                if (!name)
                    return
                const devid = devidbuf.toHex();
                const r = addRequested(devs, name, service_class, this)
                const dev = localDevs.find(d => d.deviceId == devid)
                if (dev)
                    r.boundTo = dev
            })

            devs.sort((a, b) => a.role.compare(b.role))

            this.remoteRequestedDevices = devs
            recomputeCandidates(this.remoteRequestedDevices)
        }

        scan() {
            pauseUntil(() => this.isConnected())
            this.scanCore()
        }

        clearNames() {
            this.sendCommandWithAck(JDPacket.onlyHeader(RoleManagerCmd.ClearAllRoles))
        }

        setName(sd: ServiceDescriptor, name: string) {
            this.sendCommandWithAck(JDPacket.from(RoleManagerCmd.SetRole,
                Buffer.fromHex(dev.deviceId).concat(Buffer.fromUTF8(name))))
        }

        handlePacket(pkt: JDPacket) {
        }
    }
    */
}