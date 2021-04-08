namespace jacdac {
    export const enum StatusEvent {
        ProxyStarted = 200,
        ProxyPacketReceived = 201,
        Identify = 202,
    }
    export let onStatusEvent: (event: StatusEvent) => void;

    // common logging level for jacdac services
    export let consolePriority = ConsolePriority.Debug;

    let _hostServices: Server[]
    export let _unattachedClients: Client[]
    export let _allClients: Client[]
    let _myDevice: Device;
    //% whenUsed
    export let _devices: Device[] = [];
    //% whenUsed
    let _announceCallbacks: (() => void)[] = [];
    let _newDeviceCallbacks: (() => void)[];
    let _pktCallbacks: ((p: JDPacket) => void)[];
    let restartCounter = 0
    let autoBindCnt = 0
    export let autoBind = true

    function log(msg: string) {
        console.add(consolePriority, msg);
    }

    function mkEventCmd(evCode: number) {
        // protect access to _myDevice
        let myDevice = selfDevice()
        if (!myDevice._eventCounter)
            myDevice._eventCounter = 0
        myDevice._eventCounter = (myDevice._eventCounter + 1) & CMD_EVENT_COUNTER_MASK
        if (evCode >> 8)
            throw "invalid evcode"
        return CMD_EVENT_MASK | (myDevice._eventCounter << CMD_EVENT_COUNTER_POS) | evCode
    }

    //% fixedInstances
    export class Server {
        protected supressLog: boolean;
        running: boolean
        serviceIndex: number
        protected stateUpdated: boolean;
        private _statusCode = 0; // u16, u16

        constructor(
            public name: string,
            public readonly serviceClass: number
        ) { }

        get statusCode() {
            return this._statusCode;
        }

        setStatusCode(code: number, vendorCode: number) {
            const c = ((code & 0xffff) << 16) | (vendorCode & 0xffff)
            if (c !== this._statusCode) {
                this._statusCode = c;
                this.sendChangeEvent();
            }
        }

        handlePacketOuter(pkt: JDPacket) {
            // status code support
            if (this.handleStatusCode(pkt))
                return;

            if (pkt.serviceCommand == jacdac.SystemCmd.Announce) {
                this.sendReport(
                    JDPacket.from(jacdac.SystemCmd.Announce, this.advertisementData()))
            } else {
                this.stateUpdated = false
                this.handlePacket(pkt)
            }
        }

        handlePacket(pkt: JDPacket) { }

        isConnected() {
            return this.running
        }

        advertisementData() {
            return Buffer.create(0)
        }

        protected sendReport(pkt: JDPacket) {
            pkt.serviceIndex = this.serviceIndex
            pkt._sendReport(selfDevice())
        }

        protected sendEvent(eventCode: number, data?: Buffer) {
            const pkt = JDPacket.from(mkEventCmd(eventCode), data || Buffer.create(0))
            this.sendReport(pkt)
            const now = control.millis()
            delayedSend(pkt, now + 20)
            delayedSend(pkt, now + 100)
        }

        protected sendChangeEvent(): void {
            this.sendEvent(SystemEvent.Change);
        }

        private handleStatusCode(pkt: JDPacket): boolean {
            this.handleRegUInt32(pkt, SystemReg.StatusCode, this._statusCode)
            return pkt.serviceCommand == (SystemReg.StatusCode | SystemCmd.GetRegister)
        }

        protected handleRegFormat<T extends any[]>(pkt: JDPacket, register: number, fmt: string, current: T): T {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register)
                return current
            if (getset == 1) {
                this.sendReport(JDPacket.jdpacked(pkt.serviceCommand, fmt, current))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                const v = pkt.jdunpack<T>(fmt)
                if (!jdpackEqual<T>(fmt, v, current)) {
                    this.stateUpdated = true
                    current = v
                }
            }
            return current
        }

        // only use for numbers
        protected handleRegValue<T>(pkt: JDPacket, register: number, fmt: string, current: T): T {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register)
                return current
            // make sure there's no null/undefined
            if (getset == 1) {
                this.sendReport(JDPacket.jdpacked(pkt.serviceCommand, fmt, [current]))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                const v = pkt.jdunpack(fmt);
                if (v[0] !== current) {
                    this.stateUpdated = true
                    current = v[0]
                }
            }
            return current
        }

        protected handleRegBool(pkt: JDPacket, register: number, current: boolean): boolean {
            const res = this.handleRegValue(pkt, register, "u8", current ? 1 : 0);
            return !!res;
        }

        protected handleRegInt32(pkt: JDPacket, register: number, current: number): number {
            const res = this.handleRegValue(pkt, register, "i32", current >> 0);
            return res;
        }

        protected handleRegUInt32(pkt: JDPacket, register: number, current: number): number {
            const res = this.handleRegValue(pkt, register, "u32", current >>> 0);
            return res;
        }

        protected handleRegBuffer(pkt: JDPacket, register: number, current: Buffer): Buffer {
            const getset = pkt.serviceCommand >> 12
            if (getset == 0 || getset > 2)
                return current
            const reg = pkt.serviceCommand & 0xfff
            if (reg != register)
                return current

            if (getset == 1) {
                this.sendReport(JDPacket.from(pkt.serviceCommand, current))
            } else {
                if (register >> 8 == 0x1)
                    return current // read-only
                let data = pkt.data
                const diff = current.length - data.length
                if (diff == 0) { }
                else if (diff < 0)
                    data = data.slice(0, current.length)
                else
                    data = data.concat(Buffer.create(diff))

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
            if (this.running)
                return
            this.running = true
            jacdac.start();
            this.serviceIndex = _hostServices.length
            _hostServices.push(this)
            this.log("start");
        }

        /**
         * Unregister and stops the service
         */
        stop() {
            if (!this.running)
                return
            this.running = false
            this.log("stop")
        }

        protected log(text: string) {
            if (this.supressLog || consolePriority < console.minPriority)
                return
            const dev = selfDevice().toString()
            console.add(consolePriority, `${dev}[${this.serviceIndex}]>${this.name}>${text}`);
        }
    }

    class ClientPacketQueue {
        private pkts: Buffer[] = []

        constructor(public readonly parent: Client) { }

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
            if (sn == null || this.pkts.length == 0)
                return
            let hasNonSet = false
            for (const p of this.pkts) {
                p[1] = sn
                if ((p[3] >> 4) != (CMD_SET_REG >> 12))
                    hasNonSet = true
            }
            const pkt = JDPacket.onlyHeader(0)
            pkt.compress(this.pkts)
            this.parent.sendCommand(pkt)
            // after re-sending only leave set_reg packets
            if (hasNonSet)
                this.pkts = this.pkts.filter(p => (p[3] >> 4) == (CMD_SET_REG >> 12))
        }
    }

    interface SMap<T> {
        [index: string]: T;
    }

    export class RegisterClient<TValues extends PackSimpleDataType[]> {
        private data: Buffer;
        private _localTime: number;
        private _dataChangedHandler: () => void;

        constructor(
            public readonly service: Client,
            public readonly code: number,
            public readonly packFormat: string,
            defaultValue?: TValues) {
            this.data = defaultValue && jdpack(this.packFormat, defaultValue) || Buffer.create(0);
            this._localTime = control.millis()
        }

        hasValues(): boolean {
            this.service.start();
            return !!this.data;
        }

        pauseUntilValues(timeOut?: number) {
            if (!this.hasValues())
                pauseUntil(() => this.hasValues(), timeOut || 2000)
            return this.values;
        }

        get values(): TValues {
            this.service.start();
            return jdunpack(this.data, this.packFormat) as TValues;
        }

        set values(values: TValues) {
            this.service.start();
            const d = jdpack(this.packFormat, values);
            this.data = d;
            // send set request to the service
            this.service.setReg(this.code, this.packFormat, values);
        }

        get lastGetTime() {
            return this._localTime;
        }

        onDataChanged(handler: () => void) {
            this._dataChangedHandler = handler;
        }

        handlePacket(packet: JDPacket): void {
            if (packet.isRegGet && this.code == packet.regCode) {
                const d = packet.data
                const changed = !d.equals(this.data);
                this.data = d;
                this._localTime = control.millis();
                if (changed && this._dataChangedHandler)
                    this._dataChangedHandler();
            }
        }
    }

    //% fixedInstances
    export class Client {
        device: Device
        currentDevice: Device
        protected readonly eventId: number
        broadcast: boolean // when true, this.device is never set
        serviceIndex: number;
        protected supressLog: boolean;
        started: boolean;
        protected advertisementData: Buffer;
        private handlers: SMap<(idx?: number) => void>;
        protected systemActive = false;

        protected readonly config: ClientPacketQueue
        private readonly registers: RegisterClient<PackSimpleDataType[]>[] = [];

        constructor(
            public readonly serviceClass: number,
            public role: string
        ) {
            this.eventId = control.allocateNotifyEvent();
            this.config = new ClientPacketQueue(this)
            if (!this.role)
                throw "no role"
        }

        protected addRegister<TValues extends PackSimpleDataType[]>(code: number, packFormat: string, defaultValues?: TValues): RegisterClient<TValues> {
            let reg = this.registers.find(reg => reg.code === code);
            if (!reg) {
                reg = new RegisterClient<TValues>(this, code, packFormat, defaultValues);
                this.registers.push(reg);
            }
            return reg as RegisterClient<TValues>;
        }

        register(code: number) {
            return this.registers.find(reg => reg.code === code);
        }

        broadcastDevices() {
            return devices().filter(d => d.clients.indexOf(this) >= 0)
        }

        isConnected() {
            return !!this.device
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

            for (const register of this.registers)
                register.handlePacket(pkt);
            this.handlePacket(pkt)
        }

        handlePacket(pkt: JDPacket) { }

        _attach(dev: Device, serviceNum: number) {
            if (this.device) throw "Invalid attach"
            if (!this.broadcast) {
                if (!dev.matchesRoleAt(this.role, serviceNum))
                    return false // don't attach
                this.device = dev
                this.serviceIndex = serviceNum
                _unattachedClients.removeElement(this)
            }
            log(`attached ${dev.toString()}/${serviceNum} to client ${this.role}`)
            dev.clients.push(this)
            this.onAttach()
            this.config.resend()
            return true
        }

        _detach() {
            log(`dettached ${this.role}`)
            this.serviceIndex = null
            if (!this.broadcast) {
                if (!this.device) throw "Invalid detach"
                this.device = null
                _unattachedClients.push(this)
                clearAttachCache()
            }
            this.onDetach()
        }

        protected onAttach() { }
        protected onDetach() { }

        sendCommand(pkt: JDPacket) {
            this.start()
            if (this.serviceIndex == null)
                return
            pkt.serviceIndex = this.serviceIndex
            pkt._sendCmd(this.device)
        }

        sendCommandWithAck(pkt: JDPacket) {
            this.start()
            if (this.serviceIndex == null)
                return
            pkt.serviceIndex = this.serviceIndex
            if (!pkt._sendWithAck(this.device.deviceId))
                throw "No ACK"
        }

        // this will be re-sent on (re)attach
        setReg(reg: number, format: string, values: PackSimpleDataType[]) {
            this.start();
            const payload = JDPacket.jdpacked(CMD_SET_REG | reg, format, values);
            this.config.send(payload);
        }

        setRegBuffer(reg: number, value: Buffer) {
            this.start()
            this.config.send(JDPacket.from(CMD_SET_REG | reg, value))
        }

        protected raiseEvent(value: number, argument: number) {
            control.raiseEvent(this.eventId, value)
            if (this.handlers) {
                const h = this.handlers[value + ""]
                if (h)
                    h(argument)
            }
        }

        protected registerEvent(value: number, handler: () => void) {
            this.start()
            control.onEvent(this.eventId, value, handler);
        }

        protected registerHandler(value: number, handler: (idx: number) => void) {
            this.start()
            if (!this.handlers) this.handlers = {}
            this.handlers[value + ""] = handler
        }

        protected log(text: string) {
            if (this.supressLog || consolePriority < console.minPriority)
                return
            let dev = selfDevice().toString()
            let other = this.device ? this.device.toString() : "<unbound>"
            console.add(consolePriority, `${dev}/${other}:${this.serviceClass}>${this.role}>${text}`);
        }

        start() {
            if (this.started) return
            this.started = true
            jacdac.start()
            _unattachedClients.push(this)
            _allClients.push(this)
            clearAttachCache()
        }

        destroy() {
            if (this.device)
                this.device.clients.removeElement(this)
            _unattachedClients.removeElement(this)
            _allClients.removeElement(this)
            this.serviceIndex = null
            this.device = null
            clearAttachCache()
        }

        announceCallback() { }
    }

    // 2 letter + 2 digit ID; 1.8%/0.3%/0.07%/0.015% collision probability among 50/20/10/5 devices
    export function shortDeviceId(devid: string) {
        const h = Buffer.fromHex(devid).hash(30)
        return String.fromCharCode(0x41 + h % 26) +
            String.fromCharCode(0x41 + Math.idiv(h, 26) % 26) +
            String.fromCharCode(0x30 + Math.idiv(h, 26 * 26) % 10) +
            String.fromCharCode(0x30 + Math.idiv(h, 26 * 26 * 10) % 10)
    }

    class RegQuery {
        lastQuery = 0
        lastReport = 0
        value: Buffer
        constructor(public reg: number) { }
    }

    export class Device {
        services: Buffer
        lastSeen: number
        clients: Client[] = []
        _eventCounter: number
        private _shortId: string
        private queries: RegQuery[]
        _score: number

        constructor(public deviceId: string) {
            _devices.push(this)
        }

        get isConnected() {
            return this.clients != null
        }

        get shortId() {
            // TODO measure if caching is worth it
            if (!this._shortId)
                this._shortId = shortDeviceId(this.deviceId)
            return this._shortId;
        }

        toString() {
            return this.shortId
        }

        matchesRoleAt(role: string, serviceIdx: number) {
            if (!role)
                return true

            if (role == this.deviceId)
                return true
            if (role == this.deviceId + ":" + serviceIdx)
                return true

            return jacdac._rolemgr.getRole(this.deviceId, serviceIdx) == role
        }

        private lookupQuery(reg: number) {
            if (!this.queries) this.queries = []
            return this.queries.find(q => q.reg == reg)
        }

        queryInt(reg: number, refreshRate = 1000) {
            const v = this.query(reg, refreshRate)
            if (!v) return undefined
            return intOfBuffer(v)
        }

        query(reg: number, refreshRate = 1000) {
            let q = this.lookupQuery(reg)
            if (!q)
                this.queries.push(q = new RegQuery(reg))

            const now = control.millis()
            if (!q.lastQuery ||
                (q.value === undefined && now - q.lastQuery > 500) ||
                (refreshRate != null && now - q.lastQuery > refreshRate)) {
                q.lastQuery = now
                this.sendCtrlCommand(CMD_GET_REG | reg)
            }
            return q.value
        }

        get uptime(): number {
            // create query
            this.query(ControlReg.Uptime, 60000)
            const q = this.lookupQuery(ControlReg.Uptime);
            if (q.value) {
                const up = q.value.getNumber(NumberFormat.UInt32LE, 0)
                const offset = (control.millis() - q.lastReport) * 1000
                return up + offset;
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

        handleCtrlReport(pkt: JDPacket) {
            if ((pkt.serviceCommand & CMD_TYPE_MASK) == CMD_GET_REG) {
                const reg = pkt.serviceCommand & CMD_REG_MASK
                const q = this.lookupQuery(reg)
                if (q) {
                    q.value = pkt.data
                    q.lastReport = control.millis()
                }
            }
        }

        hasService(serviceClass: number) {
            for (let i = 4; i < this.services.length; i += 4)
                if (this.services.getNumber(NumberFormat.UInt32LE, i) == serviceClass)
                    return true
            return false
        }

        clientAtServiceIndex(serviceIndex: number) {
            for (const c of this.clients) {
                if (c.device == this && c.serviceIndex == serviceIndex)
                    return c
            }
            return null
        }

        sendCtrlCommand(cmd: number, payload: Buffer = null) {
            const pkt = !payload ? JDPacket.onlyHeader(cmd) : JDPacket.from(cmd, payload)
            pkt.serviceIndex = JD_SERVICE_INDEX_CTRL
            pkt._sendCmd(this)
        }

        static clearNameCache() {
            clearAttachCache()
        }

        _destroy() {
            log("destroy " + this.shortId)
            for (let c of this.clients)
                c._detach()
            this.clients = null
        }
    }

    /**
     * Raised when an identity command request is received
     */
    //% whenUsed
    export let onIdentifyRequest = () => {
        if (pins.pinByCfg(DAL.CFG_PIN_LED)) {
            for (let i = 0; i < 7; ++i) {
                setPinByCfg(DAL.CFG_PIN_LED, true)
                pause(50)
                setPinByCfg(DAL.CFG_PIN_LED, false)
                pause(150)
            }
        }
    }

    function doNothing() { }

    class ControlService extends Server {
        constructor() {
            super("ctrl", 0)
        }

        sendUptime() {
            const buf = Buffer.create(4)
            buf.setNumber(NumberFormat.UInt32LE, 0, control.micros())
            this.sendReport(JDPacket.from(CMD_GET_REG | ControlReg.Uptime, buf));
        }

        private handleFloodPing(pkt: JDPacket) {
            let [numResponses, counter, size] = pkt.jdunpack<[number, number, number]>("u32 u32 u8")
            const payload = Buffer.create(4 + size)
            for (let i = 0; i < size; ++i)
                payload[4 + i] = i
            const queuePing = () => {
                if (numResponses <= 0) {
                    control.internalOnEvent(jacdac.__physId(), EVT_TX_EMPTY, doNothing);
                } else {
                    payload.setNumber(NumberFormat.UInt32LE, 0, counter)
                    this.sendReport(JDPacket.from(ControlCmd.FloodPing, payload))
                    numResponses--
                    counter++
                }
            }
            control.internalOnEvent(jacdac.__physId(), EVT_TX_EMPTY, queuePing);
            queuePing()
        }

        handlePacketOuter(pkt: JDPacket) {
            if (pkt.isRegGet) {
                switch (pkt.regCode) {
                    case ControlReg.Uptime: {
                        this.sendUptime();
                        break;
                    }
                    case ControlReg.DeviceDescription: {
                        this.sendReport(JDPacket.from(pkt.serviceCommand, Buffer.fromUTF8(control.programName())))
                        break
                    }
                }
            } else {
                switch (pkt.serviceCommand) {
                    case SystemCmd.Announce:
                        queueAnnounce()
                        break
                    case ControlCmd.Identify:
                        if (onIdentifyRequest)
                            control.runInParallel(onIdentifyRequest)
                        if (onStatusEvent)
                            onStatusEvent(StatusEvent.Identify)
                        break
                    case ControlCmd.Reset:
                        control.reset()
                        break
                    case ControlCmd.FloodPing:
                        this.handleFloodPing(pkt)
                        break
                }
            }
        }
    }

    /**
     * Gets the list of devices currently detected on the bus
     */
    export function devices() {
        return _devices.slice()
    }

    /**
     * Gets the Jacdac device representing the running device
     */
    export function selfDevice() {
        if (!_myDevice) {
            _myDevice = new Device(control.deviceLongSerialNumber().toHex())
            _myDevice.services = Buffer.create(4)
        }
        return _myDevice
    }

    /**
     * Raised when services from a device are announced
     * @param cb 
     */
    export function onAnnounce(cb: () => void) {
        _announceCallbacks.push(cb)
    }

    /**
     * Raised when a new device is detected on the bus
     * @param cb 
     */
    export function onNewDevice(cb: () => void) {
        if (!_newDeviceCallbacks) _newDeviceCallbacks = []
        _newDeviceCallbacks.push(cb)
    }

    export function onRawPacket(cb: (pkt: JDPacket) => void) {
        if (!_pktCallbacks) _pktCallbacks = []
        _pktCallbacks.push(cb)
    }

    function queueAnnounce() {
        const ids = _hostServices.map(h => h.running ? h.serviceClass : -1)
        if (restartCounter < 0xf) restartCounter++
        ids[0] = restartCounter | 0x100
        const buf = Buffer.create(ids.length * 4)
        for (let i = 0; i < ids.length; ++i)
            buf.setNumber(NumberFormat.UInt32LE, i * 4, ids[i]);
        JDPacket.from(SystemCmd.Announce, buf)
            ._sendReport(selfDevice())
        _announceCallbacks.forEach(f => f())
        for (const cl of _allClients)
            cl.announceCallback()
        gcDevices()

        // only try autoBind, proxy we see some devices online
        if (_devices.length > 1) {
            // check for proxy mode
            jacdac.roleManager.checkProxy()
            // auto bind
            if (autoBind) {
                autoBindCnt++
                // also, only do it every two announces (TBD)
                if (autoBindCnt >= 2) {
                    autoBindCnt = 0
                    jacdac.roleManager.autoBind();
                }
            }
        }
    }

    function clearAttachCache() {
        for (let d of _devices) {
            // add a dummy byte at the end (if not done already), to force re-attach of services
            if (d.services && (d.services.length & 3) == 0)
                d.services = d.services.concat(Buffer.create(1))
        }
    }

    function newDevice() {
        if (_newDeviceCallbacks)
            for (let f of _newDeviceCallbacks)
                f()
    }

    function reattach(dev: Device) {
        log(`reattaching services to ${dev.toString()}; cl=${_unattachedClients.length}/${_allClients.length}`)
        const newClients: Client[] = []
        const occupied = Buffer.create(dev.services.length >> 2)
        for (let c of dev.clients) {
            if (c.broadcast) {
                c._detach()
                continue // will re-attach
            }
            const newClass = dev.services.getNumber(NumberFormat.UInt32LE, c.serviceIndex << 2)
            if (newClass == c.serviceClass && dev.matchesRoleAt(c.role, c.serviceIndex)) {
                newClients.push(c)
                occupied[c.serviceIndex] = 1
            } else {
                c._detach()
            }
        }
        dev.clients = newClients

        newDevice()

        if (_unattachedClients.length == 0)
            return

        for (let i = 4; i < dev.services.length; i += 4) {
            if (occupied[i >> 2])
                continue
            const serviceClass = dev.services.getNumber(NumberFormat.UInt32LE, i)
            for (let cc of _unattachedClients) {
                if (cc.serviceClass == serviceClass) {
                    if (cc._attach(dev, i >> 2))
                        break
                }
            }
        }
    }

    function serviceMatches(dev: Device, serv: Buffer) {
        const ds = dev.services
        if (!ds || ds.length != serv.length)
            return false
        for (let i = 4; i < serv.length; ++i)
            if (ds[i] != serv[i])
                return false
        return true
    }

    export function routePacket(pkt: JDPacket) {
        // log("route: " + pkt.toString())
        const devId = pkt.deviceIdentifier
        const multiCommandClass = pkt.multicommandClass

        // TODO implement send queue for packet compression

        if (pkt.requiresAck) {
            pkt.requiresAck = false // make sure we only do it once
            if (pkt.deviceIdentifier == selfDevice().deviceId) {
                const crc = pkt.crc
                const ack = JDPacket.onlyHeader(crc)
                ack.serviceIndex = JD_SERVICE_INDEX_CRC_ACK
                ack._sendReport(selfDevice())
            }
        }

        if (_pktCallbacks)
            for (let f of _pktCallbacks)
                f(pkt)

        if (multiCommandClass != null) {
            if (!pkt.isCommand)
                return // only commands supported in multi-command
            for (const h of _hostServices) {
                if (h.serviceClass == multiCommandClass && h.running) {
                    // pretend it's directly addressed to us
                    pkt.deviceIdentifier = selfDevice().deviceId
                    pkt.serviceIndex = h.serviceIndex
                    h.handlePacketOuter(pkt)
                }
            }
        } else if (devId == selfDevice().deviceId) {
            if (!pkt.isCommand) {
                // control.dmesg(`invalid echo ${pkt}`)
                return // huh? someone's pretending to be us?
            }
            const h = _hostServices[pkt.serviceIndex]
            if (h && h.running) {
                // log(`handle pkt at ${h.name} cmd=${pkt.service_command}`)
                h.handlePacketOuter(pkt)
            }
        } else {
            if (pkt.isCommand)
                return // it's a command, and it's not for us

            let dev = _devices.find(d => d.deviceId == devId)

            if (pkt.serviceIndex == JD_SERVICE_INDEX_CTRL) {
                if (pkt.serviceCommand == SystemCmd.Announce) {
                    if (dev && (dev.services[0] & 0xf) > (pkt.data[0] & 0xf)) {
                        // if the reset counter went down, it means the device resetted; treat it as new device
                        log(`device ${dev.shortId} resetted`)
                        _devices.removeElement(dev)
                        dev._destroy()
                        dev = null
                    }

                    if (!dev) {
                        dev = new Device(pkt.deviceIdentifier)
                        // ask for uptime
                        dev.sendCtrlCommand(CMD_GET_REG | ControlReg.Uptime)
                    }

                    const matches = serviceMatches(dev, pkt.data)
                    dev.services = pkt.data
                    if (!matches) {
                        dev.lastSeen = control.millis()
                        reattach(dev)
                    }
                }
                if (dev) {
                    dev.handleCtrlReport(pkt)
                    dev.lastSeen = control.millis()
                }
                return
            } else if (pkt.serviceIndex == JD_SERVICE_INDEX_CRC_ACK) {
                _gotAck(pkt)
            }

            if (!dev)
                // we can't know the serviceClass, no announcement seen yet for this device
                return

            dev.lastSeen = control.millis()

            const serviceClass = dev.services.getNumber(NumberFormat.UInt32LE, pkt.serviceIndex << 2)
            if (!serviceClass || serviceClass == 0xffffffff)
                return

            if (pkt.isEvent) {
                let ec = dev._eventCounter
                // if ec is undefined, it's the first event, so skip processing
                if (ec !== undefined) {
                    ec++
                    // how many packets ahead and behind current are we?
                    const ahead = (pkt.eventCounter - ec) & CMD_EVENT_COUNTER_MASK
                    const behind = (ec - pkt.eventCounter) & CMD_EVENT_COUNTER_MASK
                    // ahead == behind == 0 is the usual case, otherwise
                    // behind < 60 means this is an old event (or retransmission of something we already processed)
                    // ahead < 5 means we missed at most 5 events, so we ignore this one and rely on retransmission
                    // of the missed events, and then eventually the current event
                    if (ahead > 0 && (behind < 60 || ahead < 5))
                        return
                }
                dev._eventCounter = pkt.eventCounter
            }

            const client = dev.clients.find(c =>
                c.broadcast
                    ? c.serviceClass == serviceClass
                    : c.serviceIndex == pkt.serviceIndex)
            if (client) {
                // log(`handle pkt at ${client.name} rep=${pkt.service_command}`)
                client.currentDevice = dev
                client.handlePacketOuter(pkt)
            }
        }
    }

    function gcDevices() {
        const now = control.millis()
        const cutoff = now - 2000
        selfDevice().lastSeen = now // make sure not to gc self

        let numdel = 0
        for (let i = 0; i < _devices.length; ++i) {
            const dev = _devices[i]
            if (dev.lastSeen < cutoff) {
                _devices.splice(i, 1)
                i--
                dev._destroy()
                numdel++
            }
        }
        if (numdel)
            newDevice()
    }

    const EVT_DATA_READY = 1
    const EVT_QUEUE_ANNOUNCE = 100
    const EVT_TX_EMPTY = 101

    const CFG_PIN_JDPWR_OVERLOAD_LED = 1103
    const CFG_PIN_JDPWR_ENABLE = 1104
    const CFG_PIN_JDPWR_FAULT = 1105

    function setPinByCfg(cfg: number, val: boolean) {
        const pin = pins.pinByCfg(cfg)
        if (!pin)
            return
        if (control.getConfigValue(cfg, 0) & DAL.CFG_PIN_CONFIG_ACTIVE_LO)
            val = !val
        pin.digitalWrite(val)
    }

    function enablePower(enabled = true) {
        // EN active-lo, AP2552A, AP22652A, TPS2552-1
        // EN active-hi, AP2553A, AP22653A, TPS2553-1
        setPinByCfg(CFG_PIN_JDPWR_ENABLE, enabled)
    }

    export const JACDAC_PROXY_SETTING = "__jacdac_proxy"
    function startProxy() {
        // check if a proxy restart was requested
        if (!settings.exists(JACDAC_PROXY_SETTING))
            return;

        log(`jacdac starting proxy`)
        // clear proxy flag
        settings.remove(JACDAC_PROXY_SETTING)

        // start jacdac in proxy mode
        control.internalOnEvent(jacdac.__physId(), EVT_DATA_READY, () => {
            let buf: Buffer;
            while (null != (buf = jacdac.__physGetPacket())) {
                if (onStatusEvent)
                    onStatusEvent(StatusEvent.ProxyPacketReceived)
            }
        });

        // start animation
        if (onStatusEvent)
            onStatusEvent(StatusEvent.ProxyStarted)

        // don't allow main to run until next reset
        while (true) {
            pause(100);
        }
    }

    /**
     * Starts the Jacdac service
     */
    export function start(options?: {
        disableLogger?: boolean,
        disableRoleManager?: boolean
    }): void {
        if (_hostServices)
            return // already started

        // make sure we prevent re-entering this function (potentially even log() can call us)
        _hostServices = []

        log("jacdac starting")
        options = options || {};

        const controlService = new ControlService();
        controlService.start()
        _unattachedClients = []
        _allClients = []
        //jacdac.__physStart();
        control.internalOnEvent(jacdac.__physId(), EVT_DATA_READY, () => {
            let buf: Buffer;
            while (null != (buf = jacdac.__physGetPacket())) {
                const pkt = JDPacket.fromBinary(buf)
                pkt.timestamp = jacdac.__physGetTimestamp()
                routePacket(pkt)
            }
        });
        control.internalOnEvent(jacdac.__physId(), EVT_QUEUE_ANNOUNCE, queueAnnounce);

        enablePower(true)
        const faultpin = pins.pinByCfg(CFG_PIN_JDPWR_FAULT)
        if (faultpin) {
            // FAULT is always assumed to be active-low; no external pull-up is needed
            // (and you should never pull it up to +5V!)
            faultpin.setPull(PinPullMode.PullUp)
            faultpin.digitalRead()
            onAnnounce(() => {
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

        if (!options.disableLogger) {
            console.addListener(function (pri, msg) {
                if (msg[0] != ":")
                    jacdac.logger.add(pri as number, msg);
            });
            jacdac.logger.start()
        }
        if (!options.disableRoleManager) {
            roleManager.start();
            controlService.sendUptime();
        }
        // and we're done
        log("jacdac started");
    }

    // make sure physical is started deterministically
    // on micro:bit it allocates a buffer that should stay in the same place in memory
    jacdac.__physStart();

    // check for proxy mode
    startProxy()

    // start after main
    control.runInParallel(() => start());
}
