/**
 * JACDAC command line tool
 */

const cli = require("cli")
import { PACKET_PROCESS } from "../jdom/constants"
import { createUSBBus } from "../jdom/usb"
import { getDevices, requestDevice } from "../node/nodewebusb"

cli.info("JACDAC command line")

const bus = createUSBBus({
    getDevices,
    requestDevice
})
const options = cli.parse({
    packets: ['pkt', 'show/hide all packets', true]
})

// start listening to bus
if (options.pkt) bus.on(PACKET_PROCESS, pkt => cli.debug(pkt))

async function run() {
    await bus.connectAsync();
}

// start cli
run();