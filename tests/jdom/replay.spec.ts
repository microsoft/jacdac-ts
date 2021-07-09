import { suite, test } from "mocha"

import { ButtonGestureAdapter } from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil} from "./tester";

import * as fs from 'fs';
import * as path from 'path';
import { parseTrace } from "../../src/jdom/logparser";
import TracePlayer from "../../src/jdom/traceplayer";
import { Packet, shortDeviceId } from "../../src/jdom/jacdac-jdom";
import Trace from "../../src/jdom/trace";


suite('replay', () => {
    test('replay slider', async function() {
        // TODO this needs to be cleaned up to avoid this much boilerplate on every test
        const traceRaw = parseTrace(fs.readFileSync(
            path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "utf-8").toString())
        // note pot register has device ID b62b82ccd740bde5, service command 4353, short name (?) BP95

        // TODO de-inline into utility
        const filteredPackets = traceRaw.packets.filter(packet => {
            return shortDeviceId(packet.deviceIdentifier) == "BP95"
        })
        assert(filteredPackets.length > 0, "no packets from device")
        assert(filteredPackets[0].isAnnounce, "first packet from device in trace must be announce")
        const retimedPackets = filteredPackets.map(packet => {  // announce at t=0
            const clone = packet.clone()
            clone.timestamp = clone.timestamp - filteredPackets[0].timestamp
            return clone
        })
        const trace = new Trace(retimedPackets, traceRaw.description)


        // These are here so we have a handle
        // TODO this mixes legacy and nanoservice buttons, fix me
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional

        await withBus([
            {server: buttonServer, roleName: "button"},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name

            const player = new TracePlayer(bus)
            player.trace = trace
            player.start()

            // TODO
            // pot_service = bus.awaitReady("BP95", SERVICE_POT)
            // Some way to bind the role? - on the new virtual bus

            await bus.delay(2000)

            console.log(bus.devices().map(device => {
                const servicesStr = device.services().map ( service => {
                    return `${service.name}=${service.specification.name}`
                } )
                return `${device.friendlyName}: ${servicesStr}`
            }))

        })
    }).timeout(3000)
});
