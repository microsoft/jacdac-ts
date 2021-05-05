import { JDBus } from "./bus"
import {
    CHANGE,
    DEVICE_ANNOUNCE,
    EMBED_MIN_ASPECT_RATIO,
    PACKET_PROCESS,
    PACKET_SEND,
    SRV_CONTROL,
    SRV_LOGGER,
    SRV_POWER,
    SRV_PROTO_TEST,
    SRV_ROLE_MANAGER,
    SRV_SETTINGS,
} from "./constants"
import { JDDevice } from "./device"
import JDIFrameClient from "./iframeclient"
import { resolveMakecodeServiceFromClassIdentifier } from "./makecode"
import Packet from "./packet"
import {
    arrayConcatMany,
    debounce,
    roundWithPrecision,
    SMap,
    unique,
} from "./utils"

export interface PacketMessage {
    channel: "jacdac"
    type: "messagepacket"
    broadcast: true
    data: Uint8Array
    sender?: string
}

interface SimulatorRunOptions {
    debug?: boolean
    trace?: boolean
    boardDefinition?: any //pxsim.BoardDefinition;
    parts?: string[]
    builtinParts?: string[]
    fnArgs?: any
    aspectRatio?: number
    partDefinitions?: SMap<any> // SMap<PartDefinition>;
    mute?: boolean
    highContrast?: boolean
    light?: boolean
    cdnUrl?: string
    localizedStrings?: SMap<string>
    refCountingDebug?: boolean
    version?: string
    clickTrigger?: boolean
    breakOnStart?: boolean
    storedState?: SMap<any>
    autoRun?: boolean
    ipc?: boolean
    dependencies?: SMap<string> // Map<string>;
    // single iframe, no message simulators
    single?: boolean
}

// hide the makecode device itself
const ignoredServices = [
    SRV_CONTROL,
    SRV_LOGGER,
    SRV_SETTINGS,
    SRV_ROLE_MANAGER,
    SRV_PROTO_TEST,
]

/**
 * A client that bridges received and sent packets to a parent iframe
 */
export default class IFrameBridgeClient extends JDIFrameClient {
    // this is a unique id used to trace packets sent by this bridge
    readonly bridgeId = "bridge" + Math.random()
    packetSent = 0
    packetProcessed = 0
    private _lastAspectRatio = 0

    private _runOptions: SimulatorRunOptions

    constructor(readonly bus: JDBus, readonly frameId: string) {
        super(bus)
        this.postPacket = this.postPacket.bind(this)
        this.handleMessage = this.handleMessage.bind(this)
        this.handleResize = debounce(this.handleResize.bind(this), 200)
        this.registerEvents()

        this.bus.iframeBridge = this
    }

    get dependencies() {
        return this._runOptions?.dependencies
    }

    private registerEvents() {
        console.debug(`jdiframe: listening for packets`)
        this.mount(this.bus.subscribe(PACKET_PROCESS, this.postPacket))
        this.mount(this.bus.subscribe(PACKET_SEND, this.postPacket))
        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, this.handleResize))
        // force compute add blocks button
        this.mount(this.bus.subscribe(DEVICE_ANNOUNCE, () => this.emit(CHANGE)))
        const id = setInterval(this.handleResize, 1000)
        this.mount(() => clearInterval(id))

        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage, false)
        )

        if (window.parent && window.parent !== window) {
            const frameid = window.location.hash.slice(1)
            console.debug({ frameid })
            // notify makecode we are ready
            window.parent.postMessage(
                {
                    type: "ready",
                    frameid,
                },
                "*"
            )
        }
    }

    private handleMessage(event: MessageEvent) {
        if (!this.isOriginValid(event)) return

        const { data } = event
        const msg = data as PacketMessage
        if (msg && msg.channel === "jacdac" && msg.type === "messagepacket") {
            this.handleMessageJacdac(msg)
        } else if (data?.source === "pxtdriver") {
            this.handleDriverMessage(data)
        } else {
            // unknown message
            // console.log({ data })
        }
    }

    private handleDriverMessage(msg: { type: string }) {
        //console.log("pxt message", msg)
        switch (msg.type) {
            case "run": {
                // simulation is starting
                this._runOptions = msg as SimulatorRunOptions
                this.emit(CHANGE)
                break
            }
            case "stop": // start again
                this._runOptions = undefined
                break
        }
    }

    private handleResize() {
        const { body } = document
        const size = body.getBoundingClientRect()
        const ar = size.width / (size.height + 12)
        const value = roundWithPrecision(
            Math.min(EMBED_MIN_ASPECT_RATIO, size.width / size.height),
            4
        )
        if (!isNaN(ar) && this._lastAspectRatio !== value) {
            window.parent.postMessage(
                {
                    type: "aspectratio",
                    value,
                    frameid: this.frameId,
                    sender: this.bridgeId,
                },
                "*"
            )
            this._lastAspectRatio = value
        }
    }

    private handleMessageJacdac(msg: PacketMessage) {
        if (msg.sender === this.bridgeId)
            // returning packet
            return
        // try frame format (sent by hardware, hosts)
        let pkts = Packet.fromFrame(msg.data, this.bus.timestamp)
        if (!pkts.length) {
            // try as a single packet (send by the MakeCode simulator)
            const pkt = Packet.fromBinary(msg.data, this.bus.timestamp)
            pkts = pkt && [pkt]
        }

        // bail out if unknown packet
        if (!pkts) return

        this.packetProcessed += pkts.length

        for (const pkt of pkts) {
            // we're adding a little trace to avoid resending our own packets
            pkt.sender = this.bridgeId
            // send to native bus
            this.bus.sendPacketAsync(pkt)
            // send to javascript bus
            this.bus.processPacket(pkt)
        }
    }

    private postPacket(pkt: Packet) {
        // check if this packet was already sent from another spot
        if (!!pkt.sender || !window.parent || window.parent === window) return

        this.packetSent++
        pkt.sender = this.bridgeId
        const msg: PacketMessage = {
            type: "messagepacket",
            channel: "jacdac",
            broadcast: true,
            data: pkt.toBuffer(),
            sender: this.bridgeId,
        }
        window.parent.postMessage(msg, this.origin)
    }

    deviceFilter(device: JDDevice) {
        return !!device.serviceClasses.filter(
            sc => ignoredServices.indexOf(sc) < 0
        ).length
    }

    get candidateExtensions(): string[] {
        if (!this._runOptions) {
            console.log(`no run options`)
            return []
        }

        const devices = this.bus
            .devices({ announced: true, ignoreSelf: true })
            .filter(this.deviceFilter.bind(this))
        let extensions = unique(
            arrayConcatMany(
                devices.map(device =>
                    device
                        .services()
                        .map(srv =>
                            resolveMakecodeServiceFromClassIdentifier(
                                srv.serviceClass
                            )
                        )
                        .map(info => info?.client.repo)
                        .filter(q => !!q)
                )
            )
        )
        const dependencies = Object.values(this._runOptions?.dependencies || {})
            .filter(d => /^github:/.test(d))
            .map(d => /^github:([^#]+)(#.?)?/.exec(d)[1])
        if (dependencies?.length > 0) {
            // remove all needed extenions that are already in the dependencies
            extensions = extensions.filter(extension => {
                //console.log(`check ext`, { extension })
                return dependencies.indexOf(extension) < 0
            })
        }

        return extensions
    }

    public postAddExtensions() {
        const extensions = this.candidateExtensions
        console.log(`addextensions`, {
            extensions,
            deps: this._runOptions?.dependencies,
        })
        // list all devices connected to the bus
        // and query for them, let makecode show the missing ones
        // send message to makecode
        window.parent.postMessage(
            {
                type: "addextensions",
                extensions,
                broadcast: true,
            },
            "*"
        )
    }
}
