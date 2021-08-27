/* eslint-disable @typescript-eslint/no-var-requires */
const cli = require("cli")
const fs = require("fs-extra")
import {
    ControlReg,
    DEVICE_ANNOUNCE,
    PACKET_PROCESS,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
    WEBSOCKET_TRANSPORT,
} from "../jdom/constants"
import { createUSBTransport } from "../jdom/transport/usb"
import { createNodeUSBOptions } from "../jdom/transport/nodewebusb"
import { clone } from "../jdom/utils"
import {
    routeToDTDL,
    serviceSpecificationsWithDTDL,
    serviceSpecificationToDTDL,
} from "../azure-iot/dtdlspec"
import JDBus from "../jdom/bus"
import { printPacket } from "../jdom/pretty"
import { parseLogicLog, replayLogicLog } from "../jdom/logparser"
import { dashify } from "../../jacdac-spec/spectool/jdspec"
import JDDevice from "../jdom/device"
import NodeWebSerialIO from "../jdom/transport/nodewebserialio"
import packageInfo from "../../package.json"
import { createWebSerialTransport } from "../jdom/transport/webserial"
import { Packet } from "../jdom/packet"

cli.setApp("jacdac", packageInfo.version)
cli.enable("version")

interface OptionsType {
    usb?: boolean
    serial?: boolean
    ws?: boolean
    wsPort?: number
    packets?: boolean
    dtdl?: boolean
    sdmi?: string
    devices?: string
    services?: string
    rm?: boolean
    parse?: string
    catalog?: boolean
}

const options: OptionsType = cli.parse({
    usb: ["u", "listen to Jacdac over USB"],
    serial: ["s", "listen to Jacdac over SERIAL"],
    ws: [false, "start web socket server"],
    wsPort: ["port", "specify custom web socket server port", "int"],
    packets: ["p", "show/hide all packets"],
    dtdl: [false, "generate DTDL files", "file"],
    sdmi: [false, "generate dynamic DTDL files", "string"],
    devices: ["d", "regular expression filter for devices", "string"],
    services: [false, "regular expression filter for services", "string"],
    rm: [false, "delete files from output folder"],
    parse: ["l", "parse logic analyzer log file", "string"],
    catalog: [false, "generate .json files for device catalog"],
})

// SDMI
if (options.sdmi) {
    console.log(`sdmi: generate DTDL for ${options.sdmi}`)
    const dtdl = routeToDTDL(options.sdmi)
    console.log(dtdl)
}

// DTDL
if (options.dtdl) {
    cli.info(`generating DTDL models`)
    const run = async () => {
        const dir = options.dtdl
        fs.mkdirpSync(dir)
        if (options.rm) fs.emptyDirSync(dir)
        // generate services
        {
            let services = serviceSpecificationsWithDTDL()
            if (options.services) {
                const rx = new RegExp(options.services, "i")
                services = services.filter(dev => rx.test(dev.name))
            }
            cli.info(`${services.length} services`)
            services.forEach((srv, i) => {
                const fn = `${dir}/${dashify(srv.shortName)}.json`
                cli.debug(`${srv.name} => ${fn}`)
                cli.progress(i / (services.length - 1))
                const dtdl = serviceSpecificationToDTDL(srv)
                fs.writeJSONSync(fn, dtdl, { spaces: 2 })
            })
        }

        // all done
        cli.info(`done`)
    }
    run()
}

function mkTransport() {
    if (options.serial) {
        return createWebSerialTransport(
            () => new NodeWebSerialIO(require("serialport"))
        )
    } else if (options.usb) {
        const opts = createNodeUSBOptions()
        return createUSBTransport(opts)
    } else {
        return null
    }
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
}

async function writeCatalog(dev: JDDevice) {
    const ctrl = dev.service(0)
    const desc = ctrl.register(ControlReg.DeviceDescription)
    const fwid = ctrl.register(ControlReg.ProductIdentifier)
    await Promise.all([desc.refresh(), fwid.refresh()])
    const pid = fwid.uintValue.toString(16)
    const descString =
        desc.stringValue || deviceDescription[pid] || "dev-" + pid
    const id = descString.replace(/[^a-zA-Z0-9\.\-]+/g, "-").toLowerCase()
    const spec = clone(baseDeviceSpec)
    spec.id += id
    spec.name = descString
    spec.productIdentifiers.push(fwid.uintValue)
    spec.services = dev.serviceClasses.slice(1)
    fs.writeFileSync(
        id.replace(/-/g, "") + ".json",
        JSON.stringify(spec, null, 4)
    )
    console.log(spec)
}

// USB
const transport = mkTransport()
if (transport) {
    const bus = new JDBus([transport])
    bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) => {
        console.debug(`new device ${dev}`)
        if (options.catalog && !dev.isClient) writeCatalog(dev)
    })
    if (options.packets) bus.on(PACKET_PROCESS, pkt => console.debug(pkt))
    const run = async () => {
        await bus.connect()
    }
    run()
}

if (options.ws) {
    const ws = require("ws")
    const bus = new JDBus()
    const port = options.wsPort || 8080
    const urls = [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`]
    console.log(`starting web server`)
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
        const cleanup = bus.subscribe(PACKET_PROCESS, (pkt: Packet) =>
            ws.send(pkt.toBuffer())
        )
        ws.on("close", () => {
            console.log(`ws: client disconnected`)
            cleanup?.()
        })
    })
    wss.on("error", console.error)

    // start bus
    bus.start()
}

// Logic parsing
if (options.parse) {
    const jd = new JDBus([])
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    jd.on(PACKET_RECEIVE, pkt => console.log(printPacket(pkt, opts)))
    jd.on(PACKET_RECEIVE_ANNOUNCE, pkt => console.log(printPacket(pkt, opts)))

    const text = fs.readFileSync(options.parse, "utf8")
    replayLogicLog(jd, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}
