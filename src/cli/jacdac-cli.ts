const cli = require("cli")
const fs = require("fs-extra")
import { PACKET_PROCESS } from "../jdom/constants"
import { createUSBBus } from "../jdom/usb"
import { getDevices, requestDevice } from "../node/nodewebusb"
import { deviceToDTDL, serviceToDTDL } from "../azure-iot/dtdl"
import { deviceSpecifications, serviceSpecifications } from "../jdom/spec"

cli.setApp("jacdac", "1.0.6")
cli.enable("version")

const options = cli.parse({
    usb: ['u', 'listen to JACDAC over USB', true],
    packets: ['p', 'show/hide all packets', true],
    dtdl: [false, 'generate DTDL files', "file"],
    devices: ['d', 'regular expression filter for devices', 'string'],
    rm: [false, 'delete files from output folder', true]
})

// DTDL
if (options.dtdl) {
    cli.info(`generating DTDL models`)
    const run = async () => {
        const dir = options.dtdl
        fs.mkdirpSync(dir)
        if (options.rm)
            fs.emptyDirSync(dir)
        // generate services
        {
            let services = serviceSpecifications()
            if (options.services) {
                const rx = new RegExp(options.services, "i")
                services = services.filter(dev => rx.test(dev.name))
            }
            cli.info(`${services.length} services`)
            services.forEach((srv, i) => {
                const fn = `${dir}/${srv.shortName}.json`;
                cli.debug(`${srv.name} => ${fn}`)
                cli.progress(i / (services.length - 1))
                const dtdl = serviceToDTDL(srv);
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
                const fn = `${dir}/${dev.name}.json`;
                cli.debug(`${dev.name} => ${fn}`)
                cli.progress(i / (devices.length - 1))
                const dtdl = deviceToDTDL(dev);
                fs.writeJSONSync(fn, dtdl)
            })
        }

        // all done
        cli.info(`done`)
    }
    run();
}

// USB
if (options.usb) {
    const bus = createUSBBus({
        getDevices,
        requestDevice
    })
    // start listening to bus
    if (options.pkt) bus.on(PACKET_PROCESS, pkt => cli.debug(pkt))
    const run = async () => {
        await bus.connectAsync();
    }
    run();
}
