import * as U from "./utils"
import {
    ERROR,
    EVENT,
    METADATA,
    SRV_WIFI, WifiAPFlags, WifiCmd, WifiReg
} from "./constants"
import { pack, unpack } from "./struct"
import { JDBus } from "./bus"
import { JDService } from "./service"
import { JDServiceClient } from "./serviceclient"
import Packet from "./packet"
import { SRV_TCP, TCPCmd, TCPPipeCmd, TCPTcpError, WifiEvent } from "../../jacdac-spec/dist/specconstants"
import { InPipe, InPipeReader, OutPipe } from "./pipes"
import { imageDeviceOf, serviceSpecificationFromClassIdentifier } from "./spec"
import { NumberFormat } from "./buffer"

export const GOT_IP = "gotIp"
export const LOST_IP = "lostIp"

export class WifiClient extends JDServiceClient {
    constructor(service: JDService) {
        super(service)

        this.service.event(WifiEvent.GotIp).on(EVENT, () => {
            this.connected = true
            this.emit(GOT_IP)
        })
        this.service.event(WifiEvent.LostIp).on(EVENT, () => {
            this.connected = false
            this.emit(LOST_IP)
        })
    }

    connected: boolean

    async init() {
        const reg = this.service.register(WifiReg.Connected)
        await reg.refresh()
        this.connected = reg.intValue != 0
    }

    async scan() {
        const bufs = await this.service.sendPipeCmd(WifiCmd.Scan, 5000)
        const networks = bufs.map(buf => {
            const [flags, _reserved, rssi, channel] = unpack(buf, "LLbB")
            const bssid = buf.slice(10, 16)
            const ssid = U.bufferToString(buf.slice(16))
            return {
                ssid,
                bssid,
                flags,
                rssi,
                channel
            }
        })
        networks.sort((a, b) => b.rssi - a.rssi)
        return networks
    }

    async connect(ssid: string, password?: string) {
        ssid += "\u0000"
        if (password)
            ssid += password + "\u0000"
        await this.service.sendPacketAsync(
            Packet.from(WifiCmd.Connect, U.stringToUint8Array(U.fromUTF8(ssid))),
            true)
        await this.wait(GOT_IP)
    }
}

export class TcpSocket {
    private inPipe: InPipeReader
    private outPipe: OutPipe

    constructor(public parent: TcpClient) {
    }

    async _init(hostname: string, port: number) {
        const bus = this.parent.service.device.bus
        this.inPipe = new InPipeReader(bus)
        const cmd = this.inPipe.openCommand(TCPCmd.Open)
        const resp = await this.parent.service.sendCmdAwaitResponseAsync(cmd)
        this.outPipe = new OutPipe(this.parent.service.device, resp.getNumber(NumberFormat.UInt16LE, 0))
        this.inPipe.on(METADATA, (meta: Packet) => {
            const [tag, arg] = unpack(meta.data, "Ii")
            let err = ""
            if (tag == TCPPipeCmd.Error) {
                switch (arg) {
                    case TCPTcpError.InvalidCommand:
                        err = "Invalid command"
                        break
                    case TCPTcpError.InvalidCommandPayload:
                        err = "Invalid payload"
                        break
                    default:
                        err = "Unknown TCP error: " + arg
                }
            }
            if (err)
                this.parent.emit(ERROR, err)
        })
        await this.outPipe.sendMeta(U.bufferConcat(
            pack("IH", [TCPPipeCmd.OpenSsl, port]),
            U.stringToBuffer(hostname + "\u0000")))
        const buf = await this.inPipe.read()
        if (!buf)
            throw new Error("missing first packet")
        if (buf.length)
            throw new Error("first packet expected to be empty")
    }

    write(buf: string | Uint8Array) {
        if (typeof buf == "string")
            buf = U.stringToBuffer(buf)
        return this.outPipe.send(buf)
    }

    read() {
        return this.inPipe.read()
    }

    async readAll() {
        return U.bufferConcatMany(await this.inPipe.readData(120000))
    }
}

export class TcpClient extends JDServiceClient {
    constructor(service: JDService, public wifi: WifiClient) {
        super(service)
    }

    async openSSL(hostname: string, port = 443) {
        const sock = new TcpSocket(this)
        await sock._init(hostname, port)
        return sock
    }
}

function service(bus: JDBus, serviceClass: number) {
    const serv = bus.services({ serviceClass })[0]
    if (!serv) {
        const spec = serviceSpecificationFromClassIdentifier(serviceClass)
        throw new Error("no service for " + (spec?.camelName || serviceClass))
    }
    return serv
}

export async function testWifi(bus: JDBus) {
    const wifi = new WifiClient(service(bus, SRV_WIFI))
    const tcp = new TcpClient(service(bus, SRV_TCP), wifi)
    tcp.on(ERROR, msg => {
        console.warn("tcp error: " + msg)
    })

    const ssid = localStorage["wifi_ssid"]
    const pass = localStorage["wifi_pass"]

    if (!ssid) {
        console.log("scanning wifi...")
        const networks = await wifi.scan()
        for (const net of networks)
            console.log(`${net.rssi} ${net.ssid}${net.flags & WifiAPFlags.HasPassword ? "" : " (open)"} ${U.toHex(net.bssid)}`)
        console.log(`localStorage["wifi_ssid"] = "${networks[0]?.ssid}"`)
        console.log('localStorage["wifi_pass"] = ""')
        return
    }

    await wifi.connect(ssid, pass)
    console.log("connected")

    const sock = await tcp.openSSL("bing.com")
    await sock.write("GET /\n\n")
    const resp = await sock.readAll()
    console.log(U.bufferToString(resp))
}
