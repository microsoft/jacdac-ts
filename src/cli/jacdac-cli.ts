/* eslint-disable @typescript-eslint/no-var-requires */
const cli = require("cli")
const fs = require("fs-extra")
import { DEVICE_ANNOUNCE, PACKET_PROCESS, PACKET_RECEIVE, PACKET_RECEIVE_ANNOUNCE } from "../jdom/constants"
import { createUSBTransport } from "../jdom/transport/usb"
import { createNodeUSBOptions } from "../jdom/transport/nodewebusb"
import {
    deviceSpecificationToDTDL,
    serviceSpecificationToDTDL,
} from "../azure-iot/dtdl"
import { deviceSpecifications, serviceSpecifications } from "../jdom/spec"
import { JDBus } from "../jdom/bus"
import { printPacket } from "../jdom/pretty"
import { parseLogicLog, replayLog } from "../jdom/logparser"

cli.setApp("jacdac", "1.0.6")
cli.enable("version")

interface OptionsType {
    usb?: boolean
    packets?: boolean
    dtdl?: boolean
    devices?: string
    services?: string
    rm?: boolean
    parse?: string
}

const options: OptionsType = cli.parse({
    usb: ["u", "listen to Jacdac over USB", true],
    packets: ["p", "show/hide all packets", true],
    dtdl: [false, "generate DTDL files", "file"],
    devices: ["d", "regular expression filter for devices", "string"],
    services: [false, "regular expression filter for services", "string"],
    rm: [false, "delete files from output folder", true],
    parse: ["l", "parse logic analyzer log file", "string"],
})

// DTDL
if (options.dtdl) {
    cli.info(`generating DTDL models`)
    const run = async () => {
        const dir = options.dtdl
        fs.mkdirpSync(dir)
        if (options.rm) fs.emptyDirSync(dir)
        // generate services
        {
            let services = serviceSpecifications()
            if (options.services) {
                const rx = new RegExp(options.services, "i")
                services = services.filter(dev => rx.test(dev.name))
            }
            cli.info(`${services.length} services`)
            services.forEach((srv, i) => {
                const fn = `${dir}/${srv.shortName}.json`
                cli.debug(`${srv.name} => ${fn}`)
                cli.progress(i / (services.length - 1))
                const dtdl = serviceSpecificationToDTDL(srv)
                fs.writeJSONSync(fn, dtdl)
            })
        }

        // generate devices
        {
            let devices = deviceSpecifications()
            // filters
            if (options.devices) {
                const rx = new RegExp(options.devices, "i")
                devices = devices.filter(dev => rx.test(dev.name))
            }
            cli.info(`${devices.length} devices`)
            devices.forEach((dev, i) => {
                const fn = `${dir}/${dev.name}.json`
                cli.debug(`${dev.name} => ${fn}`)
                cli.progress(i / (devices.length - 1))
                const dtdl = deviceSpecificationToDTDL(dev)
                fs.writeJSONSync(fn, dtdl)
            })
        }

        // all done
        cli.info(`done`)
    }
    run()
}

// USB
if (options.usb) {
    const opts = createNodeUSBOptions()
    const transport = createUSBTransport(opts)
    const bus = new JDBus([transport])
    bus.on(DEVICE_ANNOUNCE, dev => console.debug(`new device ${dev}`))
    if (options.packets) bus.on(PACKET_PROCESS, pkt => console.debug(pkt))
    const run = async () => {
        await bus.connect()
    }
    run()
}

// Logic parsing
if (options.parse) {
    let jd = new JDBus([])

    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true
    }
    jd.on(PACKET_RECEIVE, pkt => console.log(printPacket(pkt, opts)))
    jd.on(PACKET_RECEIVE_ANNOUNCE, pkt => console.log(printPacket(pkt, opts)))

    const text = fs.readFileSync(options.parse, "utf8")
    replayLog(jd, parseLogicLog(text), Number.POSITIVE_INFINITY);
}
