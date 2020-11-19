const cli = require("cli")
const fs = require("fs-extra")
import { PACKET_PROCESS } from "../jdom/constants"
import { createUSBBus } from "../jdom/usb"
import { getDevices, requestDevice } from "../node/nodewebusb"
import { deviceToDTDL } from "../azure-iot/dtdl"
import { deviceSpecifications } from "../jdom/spec"

cli.setApp("jacdac", "1.0.6")
cli.enable("version")

const options = cli.parse({
    usb: ['u', 'listen to JACDAC over USB', true],
    packets: ['p', 'show/hide all packets', true],
    dtdl: [false, 'generate DTDL files', "file"],
    devices: ['d', 'regular expression filter for devices', 'string']
})

// DTDL
if (options.dtdl) {
    cli.info(`generating DTDL models`)
    const run = async () => {
        const dir = options.dtdl
        fs.mkdirpSync(dir)
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
            fs.writeFileSync(fn, dtdl)
        })
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
