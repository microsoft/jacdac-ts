/* eslint-disable @typescript-eslint/no-var-requires */
const cli = require("cli")
const fs = require("fs-extra")
import {
    DEVICE_ANNOUNCE,
    PACKET_PROCESS,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
} from "../jdom/constants"
import { createUSBTransport } from "../jdom/transport/usb"
import { createNodeUSBOptions } from "../jdom/transport/nodewebusb"
import {
    routeToDTDL,
    serviceSpecificationsWithDTDL,
    serviceSpecificationToDTDL,
} from "../azure-iot/dtdlspec"
import JDBus from "../jdom/bus"
import { printPacket } from "../jdom/pretty"
import { parseLogicLog, replayLogicLog } from "../jdom/logparser"
import { dashify } from "../../jacdac-spec/spectool/jdspec"
import { createWebSerialTransport } from "../jdom/jacdac-jdom"
import NodeWebSerialIO from "../jdom/transport/nodewebserialio"

cli.setApp("jacdac", "1.0.6")
cli.enable("version")

interface OptionsType {
    usb?: boolean
    serial?: boolean
    packets?: boolean
    dtdl?: boolean
    sdmi?: string
    devices?: string
    services?: string
    rm?: boolean
    parse?: string
}

const options: OptionsType = cli.parse({
    usb: ["u", "listen to Jacdac over USB"],
    serial: ["s", "listen to Jacdac over SERIAL"],
    packets: ["p", "show/hide all packets"],
    dtdl: [false, "generate DTDL files", "file"],
    sdmi: [false, "generate dynamic DTDL files", "string"],
    devices: ["d", "regular expression filter for devices", "string"],
    services: [false, "regular expression filter for services", "string"],
    rm: [false, "delete files from output folder"],
    parse: ["l", "parse logic analyzer log file", "string"],
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

// USB
const transport = mkTransport()
if (transport) {
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
