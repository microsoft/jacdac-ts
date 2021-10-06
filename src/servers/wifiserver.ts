import {
    CHANGE,
    SRV_WIFI,
    WifiAPFlags,
    WifiCmd,
    WifiReg,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { Packet } from "../jdom/packet"
import { OutPipe } from "../jdom/pipes"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer from "../jdom/servers/serviceserver"

interface ScanResult {
    flags: WifiAPFlags
    rssi: number
    channel: number
    bssid: Uint8Array
    ssid: string
}

export class WifiServer extends JDServiceServer {
    readonly enabled: JDRegisterServer<[boolean]>
    readonly connected: JDRegisterServer<[boolean]>
    readonly ssid: JDRegisterServer<[string]>
    readonly ipAddress: JDRegisterServer<[Uint8Array]>
    readonly eui48: JDRegisterServer<[Uint8Array]>

    private _lastScanResults: ScanResult[] = []
    private _knownNetworks: {
        ssid: string
        flags: WifiAPFlags
        priority: number
        password: string
    }[] = []

    constructor() {
        super(SRV_WIFI, { intensityValues: [true] })

        this.enabled = this.addRegister(WifiReg.Enabled, [true])
        this.connected = this.addRegister(WifiReg.Connected, [false])
        this.ssid = this.addRegister(WifiReg.Ssid, [""])
        this.ipAddress = this.addRegister<[Uint8Array]>(WifiReg.IpAddress, [
            new Uint8Array(0),
        ])
        this.ipAddress = this.addRegister<[Uint8Array]>(WifiReg.Eui48, [
            new Uint8Array(0),
        ])
        this.eui48 = this.addRegister<[Uint8Array]>(WifiReg.Eui48, [
            new Uint8Array(6),
        ])

        this.addCommand(WifiCmd.Scan, this.handleScan.bind(this))
        this.addCommand(WifiCmd.Reconnect, this.handleReconnect.bind(this))
        this.addCommand(
            WifiCmd.LastScanResults,
            this.handleLastScanResults.bind(this)
        )
        this.addCommand(
            WifiCmd.ListKnownNetworks,
            this.handleListKnownNetworks.bind(this)
        )
        this.addCommand(WifiCmd.AddNetwork, this.handleAddNetwork.bind(this))
        this.addCommand(
            WifiCmd.ForgetAllNetworks,
            this.handleForgetAllNetworks.bind(this)
        )
        this.addCommand(
            WifiCmd.ForgetNetwork,
            this.handleForgetNetwork.bind(this)
        )
        this.addCommand(
            WifiCmd.SetNetworkPriority,
            this.handleSetNetworkPriority.bind(this)
        )

        this.handleReconnect()
    }

    private handleReconnect() {
        this.scan()
        const network = this._lastScanResults.filter(n =>
            this._knownNetworks.some(kn => kn.ssid === n.ssid)
        )[0]
        const { ssid } = network || {}

        this.ssid.setValues([ssid || ""])
        this.enabled.setValues([!!ssid])
        this.connected.setValues([!!ssid])
    }

    private scan() {
        this._lastScanResults = [
            Math.random() > 0.05 && {
                ssid: "HOME",
                bssid: new Uint8Array(0),
                rssi: -42,
                channel: 10,
                flags: WifiAPFlags.WPS | WifiAPFlags.IEEE_802_11B,
            },
            Math.random() > 0.5 && {
                ssid: "OFFICE",
                bssid: new Uint8Array(0),
                rssi: -70,
                channel: 11,
                flags: WifiAPFlags.IEEE_802_11N,
            },
        ].filter(res => !!res)
    }

    private handleScan() {
        this.scan()
    }

    private async handleLastScanResults(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        console.debug(`list scan results`, this._lastScanResults)
        await pipe.respondForEach(
            this._lastScanResults,
            ({ flags, rssi, channel, bssid, ssid }) =>
                jdpack<[WifiAPFlags, number, number, Uint8Array, string]>(
                    "u32 x[4] i8 u8 b[6] s[33]",
                    [flags, rssi, channel, bssid, ssid]
                )
        )
    }

    private async handleListKnownNetworks(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        console.debug(`list knowns`, this._knownNetworks)
        await pipe.respondForEach(
            this._knownNetworks,
            ({ priority, flags, ssid }) =>
                jdpack<[number, number, string]>("i16 i16 s", [
                    priority,
                    flags,
                    ssid,
                ])
        )
    }

    private handleAddNetwork(pkt: Packet) {
        const [ssid, password] = pkt.jdunpack<[string, string]>("z z")
        let network = this._knownNetworks.find(n => n.ssid === ssid)
        if (!network) {
            const scanned = this._lastScanResults.find(s => s.ssid === ssid)
            this._knownNetworks.push(
                (network = {
                    ssid,
                    flags: scanned?.flags,
                    priority: 0,
                    password: "",
                })
            )
        }
        network.password = password
    }

    private handleForgetAllNetworks() {
        this._knownNetworks = []
        this.emit(CHANGE)
    }

    private handleForgetNetwork(pkt: Packet) {
        const [ssid] = pkt.jdunpack<[string]>("s")
        this._knownNetworks = this._knownNetworks.filter(
            network => network.ssid !== ssid
        )
        this.emit(CHANGE)
    }

    private handleSetNetworkPriority(pkt: Packet) {
        const [priority, ssid] = pkt.jdunpack<[number, string]>("i16 s")
        const network = this._knownNetworks.find(
            network => network.ssid === ssid
        )
        if (network) network.priority = priority
    }
}
export default WifiServer
