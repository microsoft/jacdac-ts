import { suite, test } from "mocha"

import { ButtonGestureAdapter } from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil} from "./tester";

import * as fs from 'fs';
import * as path from 'path';
import { parseTrace } from "../../src/jdom/logparser";
import TracePlayer from "../../src/jdom/traceplayer";
import { shortDeviceId } from "../../src/jdom/jacdac-jdom";


suite('replay', () => {
    test('replay slider', async function() {
        // TODO this needs to be cleaned up to avoid this much boilerplate on every test
        const trace = parseTrace(fs.readFileSync(
            path.join(__dirname, "BP95_pot_slow_slow_fast_fast.txt"), "utf-8").toString())
        // note pot register has device ID b62b82ccd740bde5, service command 4353, short name (?) BP95

        console.log(trace.packets.map(packet => {
            return `${packet.sender}  DID=${packet.deviceIdentifier} (${shortDeviceId(packet.deviceIdentifier)})  SC=${packet.serviceCommand}  ${packet.data}`
        }))

        // These are here so we have a handle
        // TODO this mixes legacy and nanoservice buttons, fix me
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")
        


        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name


            const player = new TracePlayer(bus)
            player.trace = trace
            console.log("Trace start")
            player.start()

            await bus.delay(3000)

            console.log(bus.devices().map(device => {
                return `${device.services().length} ${device.friendlyName} ${device.shortId}`
            }))

        })
    }).timeout(5000)
});
