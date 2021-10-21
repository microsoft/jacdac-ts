import {
    CHANGE,
    SRV_WIFI,
    WifiAPFlags,
    WifiCmd,
    WifiEvent,
    WifiReg,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { Packet } from "../jdom/packet"
import { OutPipe } from "../jdom/pipes"
import { randomBytes } from "../jdom/random"
import JDRegisterServer from "../jdom/servers/registerserver"
import JDServiceServer from "../jdom/servers/serviceserver"
import { toHex } from "../jdom/utils"

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

    private _lastScanResults: ScanResult[] = [
        {
            ssid: "HOME",
            bssid: new Uint8Array(0),
            rssi: -42,
            channel: 10,
            flags: WifiAPFlags.WPS | WifiAPFlags.IEEE_802_11B,
        },
    ]
    private _knownNetworks: {
        ssid: string
        flags: WifiAPFlags
        priority: number
        password: string
    }[] = [
        {
            ssid: "HOME",
            password: "home",
            priority: 0,
            flags: WifiAPFlags.WPS | WifiAPFlags.IEEE_802_11B,
        },
    ]

    constructor() {
        super(SRV_WIFI, { intensityValues: [true] })

        this.enabled = this.addRegister(WifiReg.Enabled, [true])
        this.connected = this.addRegister(WifiReg.Connected, [false])
        this.ssid = this.addRegister(WifiReg.Ssid, [""])
        this.ipAddress = this.addRegister<[Uint8Array]>(WifiReg.IpAddress, [
            new Uint8Array(0),
        ])
        this.eui48 = this.addRegister<[Uint8Array]>(WifiReg.Eui48, [
            randomBytes(6),
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

        this.ipAddress.on(CHANGE, this.handleIpChange.bind(this))
        this.enabled.on(CHANGE, this.handleEnabledChange.bind(this))
    }

    private handleEnabledChange() {
        const [enabled] = this.enabled.values()
        if (!enabled) this.disconnect()
        else this.connect()
    }

    private handleIpChange() {
        const [ip] = this.ipAddress.values()
        console.debug(`wifi: ip ${toHex(ip)}`)
        if (ip?.length) this.sendEvent(WifiEvent.GotIp)
        else this.sendEvent(WifiEvent.LostIp)
    }

    private get scannedKnownNetworks() {
        return this._lastScanResults.filter(n =>
            this._knownNetworks.some(kn => kn.ssid === n.ssid)
        )
    }

    private handleReconnect() {
        console.debug(`wifi: reconnect`, {
            scan: this._lastScanResults,
            known: this._knownNetworks,
            networks: this.scannedKnownNetworks,
            enabled: this.enabled.values()[0],
            connected: this.connected.values()[0],
        })
        this.disconnect()
        if (this.scannedKnownNetworks.length) {
            console.debug(`wifi: reconnect, connect`)
            this.enabled.setValues([true])
        }
    }

    private connect() {
        console.debug(`wifi: connect`, {
            scan: this._lastScanResults,
            known: this._knownNetworks,
            networks: this.scannedKnownNetworks,
        })
        const network = this.scannedKnownNetworks[0]
        const { ssid } = network || {}
        this.ssid.setValues([ssid || ""])
        this.enabled.setValues([!!ssid])
        this.connected.setValues([!!ssid])
        this.ipAddress.setValues([randomBytes(4)])
    }

    private disconnect() {
        console.debug(`wifi: disconnect`)
        this.ssid.setValues([""])
        this.connected.setValues([false])
        this.enabled.setValues([false])
        this.ipAddress.setValues([new Uint8Array(0)])
    }

    private scan() {
        this._lastScanResults = [
            {
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

        this.sendEvent(
            WifiEvent.ScanComplete,
            jdpack<[number, number]>("u16 u16", [
                this._lastScanResults.length,
                this.scannedKnownNetworks.length,
            ])
        )
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
        console.debug(`wifi: add network`)
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
        this.sendEvent(WifiEvent.NetworksChanged)
    }

    private handleForgetAllNetworks() {
        this._knownNetworks = []
        this.disconnect()
        this.sendEvent(WifiEvent.NetworksChanged)
    }

    private handleForgetNetwork(pkt: Packet) {
        const [ssid] = pkt.jdunpack<[string]>("s")
        this._knownNetworks = this._knownNetworks.filter(
            network => network.ssid !== ssid
        )
        const [currentSsid] = this.ssid.values()
        if (ssid === currentSsid) this.disconnect()
        this.sendEvent(WifiEvent.NetworksChanged)
    }

    private handleSetNetworkPriority(pkt: Packet) {
        const [priority, ssid] = pkt.jdunpack<[number, string]>("i16 s")
        const network = this._knownNetworks.find(
            network => network.ssid === ssid
        )
        if (network) network.priority = priority
        this.sendEvent(WifiEvent.NetworksChanged)
    }
}
export default WifiServer