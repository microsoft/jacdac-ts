namespace jacdac {
    export const enum StatusEvent {
        ProxyStarted = 200,
        ProxyPacketReceived = 201,
        Identify = 202,
    }

    /** 
     * Register platform specific code to be run before jacdac starts 
    */
    export let onPlatformStart: () => void

    export const CHANGE = "change"
    export const DEVICE_CONNECT = "deviceConnect"
    export const DEVICE_CHANGE = "deviceChange"
    export const DEVICE_ANNOUNCE = "deviceAnnounce"
    export const SELF_ANNOUNCE = "selfAnnounce"
    export const PACKET_PROCESS = "packetProcess"
    export const REPORT_RECEIVE = "reportReceive"
    export const REPORT_UPDATE = "reportUpdate"
    export const RESTART = "restart"
    export const PACKET_RECEIVE = "packetReceive"
    export const EVENT = "packetEvent"
    export const STATUS_EVENT = "statusEvent"
    export const IDENTIFY = "identify"

    export class Bus extends jacdac.EventSource {
        readonly hostServices: Server[] = []
        readonly devices: Device[] = []
        private _myDevice: Device
        private restartCounter = 0
        private resetIn = 2000000 // 2s
        private autoBindCnt = 0
        private controlServer: ControlServer
        public readonly unattachedClients: Client[] = []
        public readonly allClients: Client[] = []

        constructor() {
            super()
        }

        get running() {
            return !!this.controlServer
        }

        start() {
            if (this.running) return

            this.controlServer = new ControlServer()
            this.controlServer.start()
            this.controlServer.sendUptime()
        }

        private gcDevices() {
            const now = control.millis()
            const cutoff = now - 2000
            this.selfDevice.lastSeen = now // make sure not to gc self

            let numdel = 0
            for (let i = 0; i < this.devices.length; ++i) {
                const dev = this.devices[i]
                if (dev.lastSeen < cutoff) {
                    this.devices.splice(i, 1)
                    i--
                    dev._destroy()
                    numdel++
                }
            }
            if (numdel) {
                this.emit(DEVICE_CHANGE)
                this.emit(CHANGE)
            }
        }

        /**
         * Gets the Jacdac device representing the running device
         */
        get selfDevice() {
            if (!this._myDevice) {
                this._myDevice = new Device(
                    control.deviceLongSerialNumber().toHex()
                )
                this._myDevice.services = Buffer.create(4)
            }
            return this._myDevice
        }

        clearAttachCache() {
            for (let d of this.devices) {
                // add a dummy byte at the end (if not done already), to force re-attach of services
                if (d.services && (d.services.length & 3) == 0)
                    d.services = d.services.concat(Buffer.create(1))
            }
        }

        queueAnnounce() {
            const ids = this.hostServices.map(h =>
                h.running ? h.serviceClass : -1
            )
            if (this.restartCounter < 0xf) this.restartCounter++
            ids[0] =
                this.restartCounter |
                ControlAnnounceFlags.IsClient |
                ControlAnnounceFlags.SupportsACK |
                ControlAnnounceFlags.SupportsBroadcast |
                ControlAnnounceFlags.SupportsFrames
            const buf = Buffer.create(ids.length * 4)
            for (let i = 0; i < ids.length; ++i)
                buf.setNumber(NumberFormat.UInt32LE, i * 4, ids[i])
            JDPacket.from(SystemCmd.Announce, buf)._sendReport(this.selfDevice)
            this.emit(SELF_ANNOUNCE)
            for (const cl of this.allClients) cl.announceCallback()
            this.gcDevices()

            // send resetin to whoever wants to listen for it
            if (this.resetIn)
                JDPacket.from(
                    ControlReg.ResetIn | CMD_SET_REG,
                    jdpack("u32", [this.resetIn])
                ).sendAsMultiCommand(SRV_CONTROL)

            // only try autoBind, proxy we see some devices online
            if (this.devices.length > 1) {
                // check for proxy mode
                jacdac.roleManagerServer.checkProxy()
                // auto bind
                if (jacdac.roleManagerServer.autoBind) {
                    this.autoBindCnt++
                    // also, only do it every two announces (TBD)
                    if (this.autoBindCnt >= 2) {
                        this.autoBindCnt = 0
                        jacdac.roleManagerServer.bindRoles()
                    }
                }
            }
        }

        detachClient(client: Client) {
            if (this.unattachedClients.indexOf(client) < 0) {
                this.unattachedClients.push(client)
                this.clearAttachCache()
            }
        }

        attachClient(client: Client) {
            this.unattachedClients.removeElement(client)
        }

        startClient(client: Client) {
            this.unattachedClients.push(client)
            this.allClients.push(client)
            this.clearAttachCache()
        }

        destroyClient(client: Client) {
            this.unattachedClients.removeElement(client)
            this.allClients.removeElement(client)
            this.clearAttachCache()
        }

        reattach(dev: Device) {
            dev.lastSeen = control.millis()
            log(
                `reattaching services to ${dev.toString()}; cl=${
                    this.unattachedClients.length
                }/${this.allClients.length}`
            )
            const newClients: Client[] = []
            const occupied = Buffer.create(dev.services.length >> 2)
            for (let c of dev.clients) {
                if (c.broadcast) {
                    c._detach()
                    continue // will re-attach
                }
                const newClass = dev.services.getNumber(
                    NumberFormat.UInt32LE,
                    c.serviceIndex << 2
                )
                if (
                    newClass == c.serviceClass &&
                    dev.matchesRoleAt(c.role, c.serviceIndex)
                ) {
                    newClients.push(c)
                    occupied[c.serviceIndex] = 1
                } else {
                    c._detach()
                }
            }
            dev.clients = newClients

            this.emit(DEVICE_ANNOUNCE, dev)

            if (this.unattachedClients.length == 0) return

            for (let i = 4; i < dev.services.length; i += 4) {
                if (occupied[i >> 2]) continue
                const serviceClass = dev.services.getNumber(
                    NumberFormat.UInt32LE,
                    i
                )
                for (let cc of this.unattachedClients) {
                    if (cc.serviceClass == serviceClass) {
                        if (cc._attach(dev, i >> 2)) break
                    }
                }
            }
        }

        processPacket(pkt: JDPacket) {
            // log("route: " + pkt.toString())
            const devId = pkt.deviceIdentifier
            const multiCommandClass = pkt.multicommandClass

            // TODO implement send queue for packet compression

            if (pkt.requiresAck) {
                pkt.requiresAck = false // make sure we only do it once
                if (pkt.deviceIdentifier == this.selfDevice.deviceId) {
                    const crc = pkt.crc
                    const ack = JDPacket.onlyHeader(crc)
                    ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK
                    ack._sendReport(this.selfDevice)
                }
            }

            this.emit(PACKET_PROCESS, pkt)

            if (multiCommandClass != null) {
                if (!pkt.isCommand) return // only commands supported in multi-command
                for (const h of this.hostServices) {
                    if (h.serviceClass == multiCommandClass && h.running) {
                        // pretend it's directly addressed to us
                        pkt.deviceIdentifier = this.selfDevice.deviceId
                        pkt.serviceIndex = h.serviceIndex
                        h.handlePacketOuter(pkt)
                    }
                }
            } else if (devId == this.selfDevice.deviceId) {
                if (!pkt.isCommand) {
                    // control.dmesg(`invalid echo ${pkt}`)
                    return // huh? someone's pretending to be us?
                }
                const h = this.hostServices[pkt.serviceIndex]
                if (h && h.running) {
                    // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                    h.handlePacketOuter(pkt)
                }
            } else {
                if (pkt.isCommand) return // it's a command, and it's not for us

                let dev = this.devices.find(d => d.deviceId == devId)

                if (pkt.serviceIndex == JD_SERVICE_INDEX_CTRL) {
                    if (pkt.serviceCommand == SystemCmd.Announce) {
                        if (dev && dev.resetCount > (pkt.data[0] & 0xf)) {
                            // if the reset counter went down, it means the device reseted;
                            // treat it as new device
                            log(`device ${dev.shortId} resetted`)
                            this.devices.removeElement(dev)
                            dev._destroy()
                            dev = null
                            this.emit(RESTART)
                        }

                        if (!dev) {
                            dev = new Device(pkt.deviceIdentifier)
                            // ask for uptime
                            dev.sendCtrlCommand(CMD_GET_REG | ControlReg.Uptime)
                            this.emit(DEVICE_CONNECT, dev)
                        }

                        const matches = serviceMatches(dev, pkt.data)
                        dev.services = pkt.data
                        if (!matches) {
                            this.reattach(dev)
                        }
                    }
                    if (dev) dev.handleCtrlReport(pkt)
                    return
                } else if (pkt.serviceIndex == JD_SERVICE_INDEX_CRC_ACK) {
                    _gotAck(pkt)
                }

                if (!dev)
                    // we can't know the serviceClass,
                    // no announcement seen yet for this device
                    return
                dev.processPacket(pkt)
            }
        }
    }

    /**
     * The Jacdac bus singleton.
     */
    export const bus: Bus = new Bus()

    // common logging level for jacdac services
    export let logPriority = LoggerPriority.Debug

    function log(msg: string) {
        jacdac.loggerServer.add(logPriority, msg)
    }

    //% fixedInstances
    export class Server extends EventSource {
        protected supressLog: boolean
        running: boolean
        serviceIndex: number
        protected stateUpdated: boolean
        private _statusCode = 0 // u16, u16

        constructor(
            public readonly instanceName: string,
            public readonly serviceClass: number
        ) {
            super()
        }

        get statusCode() {
            return this._statusCode
        }

        setStatusCode(code: number, vendorCode: number) {
            const c = ((code & 0xffff) << 16) | (vendorCode & 0xffff)
            if (c !== this._statusCode) {
                this._statusCode = c
                this.sendChangeEvent()
            }
        }

        handlePacketOuter(pkt: JDPacket) {
            switch (pkt.serviceCommand) {
                case jacdac.SystemCmd.Announce:
                    this.handleAnnounce(pkt)
                    break
                case SystemReg.StatusCode | SystemCmd.GetRegister:
                    this.handleStatusCode(pkt)
                    break
                case SystemReg.InstanceName | SystemCmd.GetRegister:
                    this.handleInstanceName(pkt)
                    break
                default:
                    this.stateUpdated = false
                    this.handlePacket(pkt)
                    break
            }
        }

        handlePacket(pkt: JDPacket) {}

        isConnected() {
            return this.running
        }

        advertisementData() {
            return Buffer.create(0)
        }

        protected sendReport(pkt: JDPacket) {
            pkt.serviceIndex = this.serviceIndex
            pkt._sendReport(bus.selfDevice)
        }

        protected sendEvent(eventCode: number, data?: Buffer) {
            const pkt = JDPacket.from(
                bus.selfDevice.mkEventCmd(eventCode),
                data || Buffer.create(0)
            )
            this.sendReport(pkt)
            const now = control.millis()
            delayedSend(pkt, now + 20)
            delayedSend(pkt, now + 100)
        }

        protected sendChangeEvent(): void {
            this.sendEvent(SystemEvent.Change)
            this.emit(CHANGE)
        }

        private handleAnnounce(pkt: JDPacket) {
            this.sendReport(
                JDPacket.from(
                    jacdac.SystemCmd.Announce,
                    this.advertisementData()
                )
            )
        }

        private handleStatusCode(pkt: JDPacket) {
            this.handleRegUInt32(pkt, SystemReg.StatusCode, this._statusCode)
        }

        private handleInstanceName(pkt: JDPacket) {
            this.handleRegValue(
                pkt,
                SystemReg.InstanceName,
                "s",
                this.instanceName
            )
        }

        protected handleRegFormat<T extends any[]>(
            pkt: JDPacket,
            register: number,
            fmt: string,
            current: T
        ): T {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2) return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register) return current
            if (getset == 1) {
                this.sendReport(
                    JDPacket.jdpacked(pkt.serviceCommand, fmt, current)
                )
            } else {
                if (register >> 8 == 0x1) return current // read-only
                const v = pkt.jdunpack<T>(fmt)
                if (!jdpackEqual<T>(fmt, v, current)) {
                    this.stateUpdated = true
                    current = v
                }
            }
            return current
        }

        // only use for numbers
        protected handleRegValue<T>(
            pkt: JDPacket,
            register: number,
            fmt: string,
            current: T
        ): T {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2) return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register) return current
            // make sure there's no null/undefined
            if (getset == 1) {
                this.sendReport(
                    JDPacket.jdpacked(pkt.serviceCommand, fmt, [current])
                )
            } else {
                if (register >> 8 == 0x1) return current // read-only
                const v = pkt.jdunpack(fmt)
                if (v[0] !== current) {
                    this.stateUpdated = true
                    current = v[0]
                }
            }
            return current
        }

        protected handleRegBool(
            pkt: JDPacket,
            register: number,
            current: boolean
        ): boolean {
            const res = this.handleRegValue(
                pkt,
                register,
                "u8",
                current ? 1 : 0
            )
            return !!res
        }

        protected handleRegInt32(
            pkt: JDPacket,
            register: number,
            current: number
        ): number {
            const res = this.handleRegValue(pkt, register, "i32", current >> 0)
            return res
        }

        protected handleRegUInt32(
            pkt: JDPacket,
            register: number,
            current: number
        ): number {
            const res = this.handleRegValue(pkt, register, "u32", current >>> 0)
            return res
        }

        protected handleRegBuffer(
            pkt: JDPacket,
            register: number,
            current: Buffer
        ): Buffer {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2) return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register) return current

            if (getset == 1) {
                this.sendReport(JDPacket.from(pkt.serviceCommand, current))
            } else {
                if (register >> 8 == 0x1) return current // read-only
                let data = pkt.data
                const diff = current.length - data.length
                if (diff == 0) {
                } else if (diff < 0) data = data.slice(0, current.length)
                else data = data.concat(Buffer.create(diff))

                if (!data.equals(current)) {
                    current.write(0, data)
                    this.stateUpdated = true
                }
            }
            return current
        }

        /**
         * Registers and starts the driver
         */
        start() {
            if (this.running) return
            this.running = true
            jacdac.start()
            this.serviceIndex = jacdac.bus.hostServices.length
            jacdac.bus.hostServices.push(this)
            this.log("start")
        }

        /**
         * Unregister and stops the service
         */
        stop() {
            if (!this.running) return
            this.running = false
            this.log("stop")
        }

        protected log(text: string) {
            // check if logging is needed
            if (this.supressLog) return
            const loggerMinPriority = jacdac.loggerServer.minPriority
            if (jacdac.logPriority < loggerMinPriority) return

            // log things up!
            const dev = bus.selfDevice.toString()
            loggerServer.add(
                logPriority,
                `${dev}${
                    this.instanceName
                        ? `.${this.instanceName}`
                        : `[${this.serviceIndex}]`
                }>${text}`
            )
        }
    }

    class ClientPacketQueue {
        private pkts: Buffer[] = []

        constructor(public readonly parent: Client) {}

        private updateQueue(pkt: JDPacket) {
            const cmd = pkt.serviceCommand
            for (let i = 0; i < this.pkts.length; ++i) {
                if (this.pkts[i].getNumber(NumberFormat.UInt16LE, 2) == cmd) {
                    this.pkts[i] = pkt.withFrameStripped()
                    return
                }
            }
            this.pkts.push(pkt.withFrameStripped())
        }

        clear() {
            this.pkts = []
        }

        send(pkt: JDPacket) {
            if (pkt.isRegSet || this.parent.serviceIndex == null)
                this.updateQueue(pkt)
            this.parent.sendCommand(pkt)
        }

        resend() {
            const sn = this.parent.serviceIndex
            if (sn == null || this.pkts.length == 0) return
            let hasNonSet = false
            for (const p of this.pkts) {
                p[1] = sn
                if (p[3] >> 4 != CMD_SET_REG >> 12) hasNonSet = true
            }
            const pkt = JDPacket.onlyHeader(0)
            pkt.compress(this.pkts)
            this.parent.sendCommand(pkt)
            // after re-sending only leave set_reg packets
            if (hasNonSet)
                this.pkts = this.pkts.filter(
                    p => p[3] >> 4 == CMD_SET_REG >> 12
                )
        }
    }

    interface SMap<T> {
        [index: string]: T
    }

    export class RegisterClient<
        TValues extends PackSimpleDataType[]
    > extends EventSource {
        private data: Buffer
        private _localTime: number

        constructor(
            public readonly service: Client,
            public readonly code: number,
            public readonly packFormat: string,
            defaultValue?: TValues
        ) {
            super()
            this.data =
                (defaultValue && jdpack(this.packFormat, defaultValue)) ||
                Buffer.create(0)
            this._localTime = control.millis()
        }

        hasValues(): boolean {
            this.service.start()
            return !!this.data
        }

        pauseUntilValues(timeOut?: number) {
            if (!this.hasValues())
                pauseUntil(() => this.hasValues(), timeOut || 2000)
            return this.values
        }

        get values(): TValues {
            this.service.start()
            return jdunpack(this.data, this.packFormat) as TValues
        }

        set values(values: TValues) {
            this.service.start()
            const d = jdpack(this.packFormat, values)
            this.data = d
            // send set request to the service
            this.service.setReg(this.code, this.packFormat, values)
        }

        get lastGetTime() {
            return this._localTime
        }

        handlePacket(packet: JDPacket): void {
            if (packet.isRegGet && this.code == packet.regCode) {
                const d = packet.data
                const changed = !d.equals(this.data)
                this.data = d
                this._localTime = control.millis()
                this.emit(REPORT_RECEIVE, this)
                if (changed) {
                    this.emit(REPORT_UPDATE, this)
                    this.emit(CHANGE)
                }
            }
        }
    }

    //% fixedInstances
    export class Client extends EventSource {
        device: Device
        currentDevice: Device
        protected readonly eventId: number
        broadcast: boolean // when true, this.device is never set
        serviceIndex: number
        protected supressLog: boolean
        started: boolean
        protected advertisementData: Buffer
        private handlers: SMap<(idx?: number) => void>
        protected systemActive = false
        private _onConnected: () => void
        private _onDisconnected: () => void

        protected readonly config: ClientPacketQueue
        private readonly registers: RegisterClient<PackSimpleDataType[]>[] = []

        constructor(public readonly serviceClass: number, public role: string) {
            super()
            this.eventId = control.allocateNotifyEvent()
            this.config = new ClientPacketQueue(this)
            if (!this.role) throw "no role"
        }

        protected addRegister<TValues extends PackSimpleDataType[]>(
            code: number,
            packFormat: string,
            defaultValues?: TValues
        ): RegisterClient<TValues> {
            let reg = this.registers.find(reg => reg.code === code)
            if (!reg) {
                reg = new RegisterClient<TValues>(
                    this,
                    code,
                    packFormat,
                    defaultValues
                )
                this.registers.push(reg)
            }
            return reg as RegisterClient<TValues>
        }

        register(code: number) {
            return this.registers.find(reg => reg.code === code)
        }

        broadcastDevices() {
            return bus.devices.filter(d => d.clients.indexOf(this) >= 0)
        }

        /**
         * Indicates if the client is bound to a server
         */
        //% blockId=jd_client_is_connected block="is %client connected"
        //% group="Services" weight=50
        //% blockNamespace="modules"
        isConnected() {
            return this.broadcast || !!this.device
        }

        /**
         * Raised when a server is connected.
         */
        //% blockId=jd_client_on_connected block="on %client connected"
        //% group="Services" weight=49
        //% blockNamespace="modules"
        onConnected(handler: () => void) {
            this._onConnected = handler
            if (this._onConnected && this.isConnected()) this.handleConnected()
        }

        /**
         * Raised when a server is connected.
         */
        //% blockId=jd_client_on_disconnected block="on %client disconnected"
        //% group="Services" weight=48
        //% blockNamespace="modules"
        onDisconnected(handler: () => void) {
            this._onDisconnected = handler
            if (this._onDisconnected && !this.isConnected())
                this._onDisconnected()
        }

        requestAdvertisementData() {
            this.sendCommand(JDPacket.onlyHeader(SystemCmd.Announce))
        }

        handlePacketOuter(pkt: JDPacket) {
            if (pkt.serviceCommand == SystemCmd.Announce)
                this.advertisementData = pkt.data

            if (pkt.isEvent) {
                const code = pkt.eventCode
                if (code == SystemEvent.Active) this.systemActive = true
                else if (code == SystemEvent.Inactive) this.systemActive = false
                this.raiseEvent(code, pkt.intData)
            }

            for (const register of this.registers) register.handlePacket(pkt)
            this.handlePacket(pkt)
        }

        handlePacket(pkt: JDPacket) {}

        _attach(dev: Device, serviceNum: number) {
            if (this.device) throw "Invalid attach"
            if (!this.broadcast) {
                if (!dev.matchesRoleAt(this.role, serviceNum)) return false // don't attach
                this.device = dev
                this.serviceIndex = serviceNum
                bus.attachClient(this)
            }
            log(
                `attached ${dev.toString()}/${serviceNum} to client ${
                    this.role
                }`
            )
            dev.clients.push(this)
            this.onAttach()
            this.handleConnected()
            return true
        }

        private handleConnected() {
            // refresh registers
            this.config.resend()
            // if the device has any status light (StatusLightRgbFade is 0b..11.. mask)
            if (this.device) {
                const flags = this.device.announceflags
                if (flags & ControlAnnounceFlags.StatusLightRgbFade)
                    control.runInParallel(() => this.connectedBlink())
            }
            // user handler
            if (this._onConnected) this._onConnected()
        }

        private connectedBlink() {
            // double quick blink, pause, 4x
            const g = 0xff >> 2
            const og = 0x01
            const tgreen = 96
            const tgreenoff = 192
            const toff = 512
            const greenRepeat = 2
            const repeat = 3

            const green = JDPacket.from(
                ControlCmd.SetStatusLight,
                jdpack<[number, number, number, number]>("u8 u8 u8 u8", [
                    0,
                    g,
                    0,
                    0,
                ])
            )
            green.serviceIndex = 0
            const greenoff = JDPacket.from(
                ControlCmd.SetStatusLight,
                jdpack<[number, number, number, number]>("u8 u8 u8 u8", [
                    0,
                    og,
                    0,
                    0,
                ])
            )
            greenoff.serviceIndex = 0
            const off = JDPacket.from(
                ControlCmd.SetStatusLight,
                jdpack<[number, number, number, number]>(
                    "u8 u8 u8 u8",
                    [0, 0, 0, 0]
                )
            )
            off.serviceIndex = 0

            for (let i = 0; i < repeat; ++i) {
                for (let j = 0; j < greenRepeat; ++j) {
                    green._sendCmd(this.device)
                    pause(tgreen)
                    greenoff._sendCmd(this.device)
                    pause(tgreenoff)
                }
                pause(toff - tgreenoff)
            }
            off._sendCmd(this.device)
        }

        _detach() {
            log(`dettached ${this.role}`)
            this.serviceIndex = null
            if (!this.broadcast) {
                if (!this.device) throw "Invalid detach"
                this.device = null
                bus.detachClient(this)
            }
            this.onDetach()
            if (this._onDisconnected) this._onDisconnected()
        }

        protected onAttach() {}
        protected onDetach() {}

        sendCommand(pkt: JDPacket) {
            this.start()
            if (this.serviceIndex == null) return
            pkt.serviceIndex = this.serviceIndex
            pkt._sendCmd(this.device)
        }

        sendCommandWithAck(pkt: JDPacket) {
            this.start()
            if (this.serviceIndex == null) return
            pkt.serviceIndex = this.serviceIndex
            if (!pkt._sendWithAck(this.device.deviceId)) throw "No ACK"
        }

        // this will be re-sent on (re)attach
        setReg(reg: number, format: string, values: PackSimpleDataType[]) {
            this.start()
            const payload = JDPacket.jdpacked(CMD_SET_REG | reg, format, values)
            this.config.send(payload)
        }

        setRegBuffer(reg: number, value: Buffer) {
            this.start()
            this.config.send(JDPacket.from(CMD_SET_REG | reg, value))
        }

        protected raiseEvent(value: number, argument: number) {
            control.raiseEvent(this.eventId, value)
            if (this.handlers) {
                const h = this.handlers[value + ""]
                if (h) h(argument)
            }
        }

        protected registerEvent(value: number, handler: () => void) {
            this.start()
            control.onEvent(this.eventId, value, handler)
        }

        protected registerHandler(
            value: number,
            handler: (idx: number) => void
        ) {
            this.start()
            if (!this.handlers) this.handlers = {}
            this.handlers[value + ""] = handler
        }

        protected log(text: string) {
            if (
                this.supressLog ||
                logPriority < jacdac.loggerServer.minPriority
            )
                return
            let dev = bus.selfDevice.toString()
            let other = this.device ? this.device.toString() : "<unbound>"
            jacdac.loggerServer.add(
                logPriority,
                `${dev}/${other}:${this.serviceClass}>${this.role}>${text}`
            )
        }

        start() {
            if (this.started) return
            this.started = true
            jacdac.start()
            jacdac.bus.startClient(this)
        }

        destroy() {
            if (this.device) this.device.clients.removeElement(this)
            this.serviceIndex = null
            this.device = null
            jacdac.bus.destroyClient(this)
        }

        announceCallback() {}
    }

    // 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
    export function shortDeviceId(devid: string) {
        const h = Buffer.fromHex(devid).hash(30)
        return (
            String.fromCharCode(0x41 + (h % 26)) +
            String.fromCharCode(0x41 + (Math.idiv(h, 26) % 26)) +
            String.fromCharCode(0x30 + (Math.idiv(h, 26 * 26) % 10)) +
            String.fromCharCode(0x30 + (Math.idiv(h, 26 * 26 * 10) % 10))
        )
    }

    class RegQuery {
        lastQuery = 0
        lastReport = 0
        value: Buffer
        constructor(public reg: number) {}
    }

    export class Device extends EventSource {
        services: Buffer
        lastSeen: number
        clients: Client[] = []
        private _eventCounter: number
        private _shortId: string
        private queries: RegQuery[]
        _score: number

        constructor(public deviceId: string) {
            super()
            bus.devices.push(this)
        }

        get announceflags(): ControlAnnounceFlags {
            return this.services
                ? this.services.getNumber(NumberFormat.UInt16LE, 0)
                : 0
        }

        get resetCount() {
            return (
                this.announceflags & ControlAnnounceFlags.RestartCounterSteady
            )
        }

        get packetCount() {
            return this.services ? this.services[2] : 0
        }

        get isConnected() {
            return this.clients != null
        }

        get shortId() {
            // TODO measure if caching is worth it
            if (!this._shortId) this._shortId = shortDeviceId(this.deviceId)
            return this._shortId
        }

        toString() {
            return this.shortId
        }

        matchesRoleAt(role: string, serviceIdx: number) {
            if (!role) return true

            if (role == this.deviceId) return true
            if (role == this.deviceId + ":" + serviceIdx) return true

            return jacdac._rolemgr.getRole(this.deviceId, serviceIdx) == role
        }

        private lookupQuery(reg: number) {
            if (!this.queries) this.queries = []
            return this.queries.find(q => q.reg == reg)
        }

        get serviceClassLength() {
            return !this.services ? 0 : this.services.length >> 2
        }

        serviceClassAt(serviceIndex: number) {
            return serviceIndex == 0
                ? 0
                : this.services
                ? this.services.getNumber(
                      NumberFormat.UInt32LE,
                      serviceIndex << 2
                  )
                : 0
        }

        queryInt(reg: number, refreshRate = 1000) {
            const v = this.query(reg, refreshRate)
            if (!v) return undefined
            return intOfBuffer(v)
        }

        query(reg: number, refreshRate = 1000) {
            let q = this.lookupQuery(reg)
            if (!q) this.queries.push((q = new RegQuery(reg)))

            const now = control.millis()
            if (
                !q.lastQuery ||
                (q.value === undefined && now - q.lastQuery > 500) ||
                (refreshRate != null && now - q.lastQuery > refreshRate)
            ) {
                q.lastQuery = now
                this.sendCtrlCommand(CMD_GET_REG | reg)
            }
            return q.value
        }

        get uptime(): number {
            // create query
            this.query(ControlReg.Uptime, 60000)
            const q = this.lookupQuery(ControlReg.Uptime)
            if (q.value) {
                const up = q.value.getNumber(NumberFormat.UInt32LE, 0)
                const offset = (control.millis() - q.lastReport) * 1000
                return up + offset
            }
            return undefined
        }

        get mcuTemperature(): number {
            return this.queryInt(ControlReg.McuTemperature)
        }

        get firmwareVersion(): string {
            const b = this.query(ControlReg.FirmwareVersion, null)
            if (b) return b.toString()
            else return ""
        }

        get firmwareUrl(): string {
            const b = this.query(ControlReg.FirmwareUrl, null)
            if (b) return b.toString()
            else return ""
        }

        get deviceUrl(): string {
            const b = this.query(ControlReg.DeviceUrl, null)
            if (b) return b.toString()
            else return ""
        }

        processPacket(pkt: JDPacket) {
            this.lastSeen = control.millis()
            this.emit(PACKET_RECEIVE, pkt)

            const serviceClass = this.serviceClassAt(pkt.serviceIndex)
            if (!serviceClass || serviceClass == 0xffffffff) return

            if (pkt.isEvent) {
                let ec = this._eventCounter
                // if ec is undefined, it's the first event, so skip processing
                if (ec !== undefined) {
                    ec++
                    // how many packets ahead and behind current are we?
                    const ahead =
                        (pkt.eventCounter - ec) & CMD_EVENT_COUNTER_MASK
                    const behind =
                        (ec - pkt.eventCounter) & CMD_EVENT_COUNTER_MASK
                    // ahead == behind == 0 is the usual case, otherwise
                    // behind < 60 means this is an old event (or retransmission of something we already processed)
                    // ahead < 5 means we missed at most 5 events, so we ignore this one and rely on retransmission
                    // of the missed events, and then eventually the current event
                    if (ahead > 0 && (behind < 60 || ahead < 5)) return
                    // we got our event
                    this.emit(EVENT, pkt)
                    bus.emit(EVENT, pkt)
                }
                this._eventCounter = pkt.eventCounter
            }

            const client = this.clients.find(c =>
                c.broadcast
                    ? c.serviceClass == serviceClass
                    : c.serviceIndex == pkt.serviceIndex
            )
            if (client) {
                // log(`handle pkt at ${client.name} rep=${pkt.service_command}`)
                client.currentDevice = this
                client.handlePacketOuter(pkt)
            }
        }

        handleCtrlReport(pkt: JDPacket) {
            this.lastSeen = control.millis()
            if (pkt.isRegGet) {
                const reg = pkt.regCode
                const q = this.lookupQuery(reg)
                if (q) {
                    q.value = pkt.data
                    q.lastReport = control.millis()
                }
            }
        }

        hasService(serviceClass: number) {
            const n = this.serviceClassLength
            for (let i = 0; i < n; ++i)
                if (this.serviceClassAt(i) === serviceClass) return true
            return false
        }

        clientAtServiceIndex(serviceIndex: number) {
            for (const c of this.clients) {
                if (c.device == this && c.serviceIndex == serviceIndex) return c
            }
            return null
        }

        sendCtrlCommand(cmd: number, payload: Buffer = null) {
            const pkt = !payload
                ? JDPacket.onlyHeader(cmd)
                : JDPacket.from(cmd, payload)
            pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
            pkt._sendCmd(this)
        }

        mkEventCmd(evCode: number) {
            if (!this._eventCounter) this._eventCounter = 0
            this._eventCounter =
                (this._eventCounter + 1) & CMD_EVENT_COUNTER_MASK
            if (evCode >> 8) throw "invalid evcode"
            return (
                CMD_EVENT_MASK |
                (this._eventCounter << CMD_EVENT_COUNTER_POS) |
                evCode
            )
        }

        _destroy() {
            log("destroy " + this.shortId)
            for (let c of this.clients) c._detach()
            this.clients = null
        }
    }

    function doNothing() {}

    export class ControlServer extends Server {
        constructor() {
            super("ctrl", 0)
        }

        sendUptime() {
            const buf = Buffer.create(4)
            buf.setNumber(NumberFormat.UInt32LE, 0, control.micros())
            this.sendReport(JDPacket.from(CMD_GET_REG | ControlReg.Uptime, buf))
        }

        private handleFloodPing(pkt: JDPacket) {
            let [numResponses, counter, size] =
                pkt.jdunpack<[number, number, number]>("u32 u32 u8")
            const payload = Buffer.create(4 + size)
            for (let i = 0; i < size; ++i) payload[4 + i] = i
            const queuePing = () => {
                if (numResponses <= 0) {
                    control.internalOnEvent(
                        jacdac.__physId(),
                        EVT_TX_EMPTY,
                        doNothing
                    )
                } else {
                    payload.setNumber(NumberFormat.UInt32LE, 0, counter)
                    this.sendReport(
                        JDPacket.from(ControlCmd.FloodPing, payload)
                    )
                    numResponses--
                    counter++
                }
            }
            control.internalOnEvent(jacdac.__physId(), EVT_TX_EMPTY, queuePing)
            queuePing()
        }

        handlePacketOuter(pkt: JDPacket) {
            if (pkt.isRegGet) {
                switch (pkt.regCode) {
                    case ControlReg.Uptime: {
                        this.sendUptime()
                        break
                    }
                    case ControlReg.DeviceDescription: {
                        this.sendReport(
                            JDPacket.from(
                                pkt.serviceCommand,
                                Buffer.fromUTF8(control.programName())
                            )
                        )
                        break
                    }
                }
            } else {
                switch (pkt.serviceCommand) {
                    case SystemCmd.Announce:
                        bus.queueAnnounce()
                        break
                    case ControlCmd.Identify:
                        this.log("identify")
                        bus.emit(IDENTIFY)
                        bus.emit(STATUS_EVENT, StatusEvent.Identify)
                        break
                    case ControlCmd.Reset:
                        this.log("reset requested")
                        control.reset()
                        break
                    case ControlCmd.FloodPing:
                        this.log("flood")
                        this.handleFloodPing(pkt)
                        break
                }
            }
        }
    }

    function serviceMatches(dev: Device, serv: Buffer) {
        const ds = dev.services
        if (!ds || ds.length != serv.length) return false
        for (let i = 4; i < serv.length; ++i) if (ds[i] != serv[i]) return false
        return true
    }

    const EVT_DATA_READY = 1
    const EVT_QUEUE_ANNOUNCE = 100
    const EVT_TX_EMPTY = 101

    const CFG_PIN_JDPWR_OVERLOAD_LED = 1103
    const CFG_PIN_JDPWR_ENABLE = 1104
    const CFG_PIN_JDPWR_FAULT = 1105

    function setPinByCfg(cfg: number, val: boolean) {
        const pin = pins.pinByCfg(cfg)
        if (!pin) return
        if (control.getConfigValue(cfg, 0) & DAL.CFG_PIN_CONFIG_ACTIVE_LO)
            val = !val
        pin.digitalWrite(val)
    }

    function enablePower(enabled = true) {
        // EN active-lo, AP2552A, AP22652A, TPS2552-1
        // EN active-hi, AP2553A, AP22653A, TPS2553-1
        setPinByCfg(CFG_PIN_JDPWR_ENABLE, enabled)
    }

    function enablePowerFaultPin() {
        const faultpin = pins.pinByCfg(CFG_PIN_JDPWR_FAULT)
        if (faultpin) {
            log(`enabling power fault pin`)
            // FAULT is always assumed to be active-low; no external pull-up is needed
            // (and you should never pull it up to +5V!)
            faultpin.setPull(PinPullMode.PullUp)
            faultpin.digitalRead()
            jacdac.bus.on(SELF_ANNOUNCE, () => {
                if (faultpin.digitalRead() == false) {
                    control.runInParallel(() => {
                        control.dmesg("jacdac power overload; restarting power")
                        enablePower(false)
                        setPinByCfg(CFG_PIN_JDPWR_OVERLOAD_LED, true)
                        pause(200) // wait some time for the LED to be noticed; also there's some de-glitch time on EN
                        setPinByCfg(CFG_PIN_JDPWR_OVERLOAD_LED, false)
                        enablePower(true)
                    })
                }
            })
        }
    }

    function enableIdentityLED() {
        if (pins.pinByCfg(DAL.CFG_PIN_LED)) {
            log(`enabling identity LED`)
            bus.on(IDENTIFY, () =>
                control.runInBackground(function () {
                    for (let i = 0; i < 7; ++i) {
                        setPinByCfg(DAL.CFG_PIN_LED, true)
                        pause(50)
                        setPinByCfg(DAL.CFG_PIN_LED, false)
                        pause(150)
                    }
                })
            )
        }
    }

    export const JACDAC_PROXY_SETTING = "__jacdac_proxy"
    function startProxy() {
        // check if a proxy restart was requested
        if (!settings.exists(JACDAC_PROXY_SETTING)) return

        log(`jacdac starting proxy`)
        // clear proxy flag
        settings.remove(JACDAC_PROXY_SETTING)

        // start jacdac in proxy mode
        control.internalOnEvent(jacdac.__physId(), EVT_DATA_READY, () => {
            let buf: Buffer
            while (null != (buf = jacdac.__physGetPacket())) {
                jacdac.bus.emit(STATUS_EVENT, StatusEvent.ProxyPacketReceived)
            }
        })

        // start animation
        jacdac.bus.emit(STATUS_EVENT, StatusEvent.ProxyStarted)

        // don't allow main to run until next reset
        while (true) {
            pause(100)
        }
    }

    /**
     * Starts the Jacdac service
     */
    export function start(options?: {
        disableLogger?: boolean
        disableRoleManager?: boolean
    }): void {
        if (jacdac.bus.running) return // already started
        // make sure we prevent re-entering this function (potentially even log() can call us)
        bus.start()

        log("jacdac starting")
        options = options || {}

        //jacdac.__physStart();
        control.internalOnEvent(jacdac.__physId(), EVT_DATA_READY, () => {
            let buf: Buffer
            while (null != (buf = jacdac.__physGetPacket())) {
                const pkt = JDPacket.fromBinary(buf)
                pkt.timestamp = jacdac.__physGetTimestamp()
                jacdac.bus.processPacket(pkt)
            }
        })
        control.internalOnEvent(jacdac.__physId(), EVT_QUEUE_ANNOUNCE, () =>
            jacdac.bus.queueAnnounce()
        )

        enablePower(true)
        enablePowerFaultPin()
        enableIdentityLED()

        if (!options.disableLogger) {
            console.addListener(function (pri, msg) {
                if (msg[0] != ":") jacdac.loggerServer.add(pri as number, msg)
            })
            jacdac.loggerServer.start()
        }
        if (!options.disableRoleManager) {
            roleManagerServer.start()
        }
        // and we're done
        log("jacdac started")
    }

    // make sure physical is started deterministically
    // on micro:bit it allocates a buffer that should stay in the same place in memory
    jacdac.__physStart()

    // platform setup
    if(onPlatformStart)
        onPlatformStart()

    // check for proxy mode
    startProxy()

    // start after main
    control.runInParallel(() => start())
}
