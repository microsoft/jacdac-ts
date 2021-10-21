/* eslint-disable @typescript-eslint/no-var-requires */
const cli = require("cli")
const fs = require("fs-extra")
import {
    ControlReg,
    DEVICE_ANNOUNCE,
    PACKET_PROCESS,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
    PACKET_SEND,
    WEBSOCKET_TRANSPORT,
    createUSBTransport,
    createNodeUSBOptions,
    clone,
    JDBus,
    printPacket,
    parseLogicLog,
    replayLogicLog,
    dashify,
    JDDevice,
    Packet,
    createNodeWebSerialTransport,
    Transport,
    serializeToTrace,
    isCancelError,
} from "../jdom/jacdac-jdom"
import packageInfo from "../../package.json"
import {
    serviceSpecificationsWithServiceTwinSpecification,
    serviceSpecificationToServiceTwinSpecification,
} from "../azure-iot/jacdac-azure-iot"

cli.setApp("jacdac", packageInfo.version)
cli.enable("version")

interface OptionsType {
    usb?: boolean
    serial?: boolean
    streaming?: boolean
    ws?: boolean
    port?: number
    packets?: boolean
    devicetwin?: boolean
    devices?: string
    services?: string
    rm?: boolean
    parse?: string
    catalog?: boolean
}

const options: OptionsType = cli.parse({
    streaming: [false, "ask all sensors to stream data"],
    usb: ["u", "listen to Jacdac over USB"],
    serial: ["s", "listen to Jacdac over SERIAL"],
    ws: [false, "start web socket server"],
    port: [false, "specify custom web socket server port", "int"],
    packets: ["p", "show/hide all packets"],
    devicetwin: [false, "generate device twin files", "file"],
    devices: ["d", "regular expression filter for devices", "string"],
    services: [false, "regular expression filter for services", "string"],
    rm: [false, "delete files from output folder"],
    parse: ["l", "parse logic analyzer log file", "string"],
    catalog: [false, "generate .json files for device catalog"],
})

// DeviceTwin
if (options.devicetwin) {
    cli.info(`generating DeviceTwin models`)
    const run = async () => {
        const dir = options.devicetwin
        fs.mkdirpSync(dir)
        if (options.rm) fs.emptyDirSync(dir)
        // generate services
        {
            let services = serviceSpecificationsWithServiceTwinSpecification()
            if (options.services) {
                const rx = new RegExp(options.services, "i")
                services = services.filter(dev => rx.test(dev.name))
            }
            cli.info(`${services.length} services`)
            services.forEach((srv, i) => {
                const fn = `${dir}/${dashify(srv.shortName)}.json`
                cli.debug(`${srv.name} => ${fn}`)
                cli.progress(i / (services.length - 1))
                const serviceTwin =
                    serviceSpecificationToServiceTwinSpecification(srv)
                fs.writeJSONSync(fn, serviceTwin, { spaces: 2 })
            })
        }

        // all done
        cli.info(`done`)
    }
    run()
}

function mkTransports(): Transport[] {
    const transports: Transport[] = []
    if (options.usb) {
        console.debug(`adding USB transport`)
        transports.push(createUSBTransport(createNodeUSBOptions()))
    }
    if (options.serial) {
        console.debug(`adding serial transport`)
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }
    return transports
}

// Device catalog support
// A good command to resize images:
// magick image.jpg -scale 650 -strip -interlace JPEG -define jpeg:dct-method=float -quality 85% image-scaled.jpg
// this command can be used to auto-rename image files
// mv -i `ls IMG_* | head -1` `ls -t | head -1 | sed -e 's/\.json/.jpg/'`
const baseDeviceSpec: jdspec.DeviceSpec = {
    id: "microsoft-research-",
    name: "",
    company: "Microsoft Research",
    description: "",
    repo: "https://github.com/microsoft/jacdac-msr-modules",
    link: "https://github.com/microsoft/jacdac-msr-modules",
    services: [],
    productIdentifiers: [],
}

// for devices that don't expose it
const deviceDescription: Record<string, string> = {
    "357084e1": "JM Button 10 v1.3",
    "3f9ca24e": "JM Keyboard Key 46 v1.0",
    "3a3320ac": "JM Analog Joystick 44 v0.2",
    "36b4f47c": "JM Single RGB LED 42 v0.1",
    "36550513": "JM Keyboard Key 46 v1.1",
    "3e700a4b": "JM Button Terminal 62 v0.1",
    "357512db": "JM Ambient Light 55 v0.1",
}

async function writeCatalog(dev: JDDevice) {
    const ctrl = dev.service(0)
    const desc = ctrl.register(ControlReg.DeviceDescription)
    const fwid = ctrl.register(ControlReg.ProductIdentifier)
    await Promise.all([desc.refresh(), fwid.refresh()])
    const pid = fwid.uintValue.toString(16)
    const descString =
        desc.stringValue || deviceDescription[pid] || "dev-" + pid
    const id = descString.replace(/[^a-zA-Z0-9.-]+/g, "-").toLowerCase()
    const spec = clone(baseDeviceSpec)
    spec.id += id
    spec.name = descString
    spec.productIdentifiers.push(fwid.uintValue)
    spec.services = dev.serviceClasses.slice(1)
    fs.writeFileSync(
        id.replace(/[-.]/g, "") + ".json",
        JSON.stringify(spec, null, 4)
    )
    console.log(spec)
}

// USB
const transports = mkTransports()
if (transports?.length || options.ws) {
    console.log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) => {
        if (options.catalog && !dev.isClient) writeCatalog(dev)
    })
    if (options.ws) {
        const ws = require("ws")
        const port = options.port || 8080
        const urls = [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`]
        console.log(`starting web socket server`)
        urls.forEach(url => console.log(`\t${url}`))
        const wss = new ws.WebSocketServer({ port })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wss.on("connection", (ws: any) => {
            console.log(`ws: client connected`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ws.on("message", (message: any) => {
                const data = new Uint8Array(message as ArrayBuffer)
                const pkt = Packet.fromBinary(data, bus.timestamp)
                pkt.sender = WEBSOCKET_TRANSPORT
                bus.processPacket(pkt)
            })
            const cleanup = bus.subscribe(
                [PACKET_PROCESS, PACKET_SEND],
                (pkt: Packet) => {
                    ws.send(pkt.toBuffer())
                }
            )
            ws.on("close", () => {
                console.log(`ws: client disconnected`)
                cleanup?.()
            })
        })
        wss.on("error", console.error)
    }
    if (options.packets)
        bus.on(PACKET_PROCESS, (pkt: Packet) => {
            const str = printPacket(pkt, {
                showTime: true,
                skipRepeatedAnnounce: true,
                skipResetIn: true,
            })
            if (str) console.debug(serializeToTrace(pkt, 0))
        })
    bus.streaming = !!options.streaming
    bus.start()
    const run = async () => {
        try {
            await bus.connect()
        } catch (e) {
            if (!isCancelError(e)) console.error(e)
        }
    }
    run()
}

// Logic parsing
if (options.parse) {
    const bus = new JDBus([], { client: false })
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    bus.on(PACKET_RECEIVE, pkt => console.log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_ANNOUNCE, pkt => console.log(printPacket(pkt, opts)))

    const text = fs.readFileSync(options.parse, "utf8")
    replayLogicLog(bus, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}
