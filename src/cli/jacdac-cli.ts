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
const {
    mkdirpSync,
    emptyDirSync,
    writeJSONSync,
    readFileSync,
    writeFileSync,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("fs-extra")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { program } = require("commander")
import type { CommandOptions } from "commander"

const info = console.info
const debug = console.debug
const error = console.error

async function mainCli() {
    const createCommand = (name: string, opts?: CommandOptions) => {
        const cmd = program.command(name, opts)
        return cmd
    }

    program.version(packageInfo.version)

    createCommand("devicetwin")
        .argument("<dir>", "output folder path")
        .option("--rm", "remove all files before generating")
        .option("--services", "regular expression to filter service names")
        .description("generate device twins")
        .action(devicetwinCommand)

    createCommand("parse")
        .argument("<file>", "logic analyzer log file")
        .description("parse a Logic analyzer trace and replay packets")
        .action(parseCommand)

    createCommand("stream", { isDefault: true })
        .option("--streaming", "stream sensors data")
        .option("--usb", "listen to Jacdac over USB")
        .option("--serial", "listen to Jacdac over SERIAL")
        .option("--packets", "show all packets")
        .option("--ws", "start web socket server")
        .option("--port <number>", "specify custom web socket server port")
        .option("--devices <string>", "regular expression filter for devices")
        .option("--services <string>", "regular expression filter for services")
        .option("--rm", "delete files from output folder")
        .option("--catalog", "generate .json files for device catalog")
        .action(streamCommand)

    await program.parseAsync(process.argv)
}

/*
interface OptionsType {
    usb?: boolean
    serial?: boolean
    streaming?: boolean
    ws?: boolean
    port?: number
    packets?: boolean
    devices?: string
    services?: string
    rm?: boolean
    catalog?: boolean
}
const options: OptionsType = cli.parse({
})
*/

async function mainWrapper() {
    try {
        await mainCli()
    } catch (e) {
        error("Exception: " + e.stack)
        error("Build failed")
        process.exit(1)
    }
}

mainWrapper()

async function devicetwinCommand(
    dir: string,
    options: { rm?: boolean; services?: string } = {}
) {
    console.info(`generating DeviceTwin models`)
    mkdirpSync(dir)
    if (options.rm) emptyDirSync(dir)
    // generate services
    {
        let services = serviceSpecificationsWithServiceTwinSpecification()
        if (options.services) {
            const rx = new RegExp(options.services, "i")
            services = services.filter(dev => rx.test(dev.name))
        }
        info(`${services.length} services`)
        services.forEach((srv, i) => {
            const fn = `${dir}/${dashify(srv.shortName)}.json`
            debug(`${srv.name} => ${fn}`)
            const serviceTwin =
                serviceSpecificationToServiceTwinSpecification(srv)
            writeJSONSync(fn, serviceTwin, { spaces: 2 })
        })
    }

    // all done
    info(`done`)
}

async function streamCommand(
    options: {
        usb?: boolean
        serial?: boolean
        ws?: boolean
        catalog?: boolean
        port?: number
        packets?: boolean
        streaming?: boolean
    } = {}
) {
    const transports: Transport[] = []
    if (options.usb) {
        console.debug(`adding USB transport`)
        transports.push(createUSBTransport(createNodeUSBOptions()))
    }
    if (options.serial) {
        console.debug(`adding serial transport`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }

    console.log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) => {
        if (options.catalog && !dev.isClient) writeCatalog(dev)
    })
    if (options.ws) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    writeFileSync(
        id.replace(/[-.]/g, "") + ".json",
        JSON.stringify(spec, null, 4)
    )
    console.log(spec)
}

async function parseCommand(file: string) {
    const bus = new JDBus([], { client: false })
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    bus.on(PACKET_RECEIVE, pkt => console.log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_ANNOUNCE, pkt => console.log(printPacket(pkt, opts)))

    const text = readFileSync(file, "utf8")
    replayLogicLog(bus, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}
