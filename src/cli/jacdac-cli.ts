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
    JDDevice,
    Packet,
    createNodeWebSerialTransport,
    Transport,
    serializeToTrace,
    isCancelError,
} from "../jdom/jacdac-jdom"
import packageInfo from "../../package.json"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFileSync, writeFileSync } = require("fs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { program } = require("commander")
import type { CommandOptions } from "commander"

const log = console.log
const debug = console.debug
const error = console.error

async function mainCli() {
    const createCommand = (name: string, opts?: CommandOptions) => {
        const cmd = program.command(name, opts)
        return cmd
    }

    log(`jacdac cli`)
    program.version(packageInfo.version)

    createCommand("parse")
        .argument("<file>", "logic analyzer log file")
        .description("parse a Logic analyzer trace and replay packets")
        .action(parseCommand)

    createCommand("stream", { isDefault: true })
        .option("--sensors", "stream sensors data")
        .option("-u, --usb", "listen to Jacdac over USB")
        .option("-s, --serial", "listen to Jacdac over SERIAL")
        .option("-p, --packets", "show all packets")
        .option("--ws", "start web socket server")
        .option("--port <number>", "specify custom web socket server port")
        .option("--devices <string>", "regular expression filter for devices")
        .option("--services <string>", "regular expression filter for services")
        .option("--rm", "delete files from output folder")
        .option("--catalog", "generate .json files for device catalog")
        .action(streamCommand)

    await program.parseAsync(process.argv)
}

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

async function streamCommand(
    options: {
        usb?: boolean
        serial?: boolean
        ws?: boolean
        catalog?: boolean
        port?: number
        packets?: boolean
        sensors?: boolean
    } = {}
) {
    if (!options.usb && !options.serial) options.usb = options.serial = true

    const transports: Transport[] = []
    if (options.usb) {
        debug(`adding USB transport`)
        debug(
            `on windows, node.js will crash if you haven't setup libusb properly...`
        )
        transports.push(createUSBTransport(createNodeUSBOptions()))
    }
    if (options.serial) {
        debug(`adding serial transport`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }

    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.on(DEVICE_ANNOUNCE, (dev: JDDevice) => {
        if (options.catalog && !dev.isClient) writeCatalog(dev)
    })
    if (options.ws) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ws = require("ws")
        const port = options.port || 8080
        const urls = [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`]
        log(`starting web socket server`)
        urls.forEach(url => debug(`\t${url}`))
        const wss = new ws.WebSocketServer({ port })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wss.on("connection", (ws: any) => {
            debug(`ws: client connected`)
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
                debug(`ws: client disconnected`)
                cleanup?.()
            })
        })
        wss.on("error", error)
    }
    if (options.packets)
        bus.on(PACKET_PROCESS, (pkt: Packet) => {
            const str = printPacket(pkt, {
                showTime: true,
                skipRepeatedAnnounce: true,
                skipResetIn: true,
            })
            if (str) debug(serializeToTrace(pkt, 0))
        })
    bus.streaming = !!options.sensors
    bus.start()
    const run = async () => {
        try {
            await bus.connect()
        } catch (e) {
            if (!isCancelError(e)) error(e)
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
    debug(spec)
}

async function parseCommand(file: string) {
    const bus = new JDBus([], { client: false })
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    bus.on(PACKET_RECEIVE, pkt => log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_ANNOUNCE, pkt => log(printPacket(pkt, opts)))

    const text = readFileSync(file, "utf8")
    replayLogicLog(bus, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}
