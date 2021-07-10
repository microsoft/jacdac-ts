import { suite, test } from "mocha"

import { ButtonGestureAdapter } from "../../src/servers/buttongestureadapter"
import { PotentiometerToButtonEdgeAdapter } from "../../src/servers/potbuttonadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil, TraceServer} from "./tester";

import * as fs from 'fs';
import * as path from 'path';
import { parseTrace } from "../../src/jdom/logparser";
import TracePlayer from "../../src/jdom/traceplayer";
import { Packet, shortDeviceId, SRV_POTENTIOMETER } from "../../src/jdom/jacdac-jdom";
import Trace from "../../src/jdom/trace";


suite('replay', () => {
    test('replay slider', async function() {
        // These are here so we have a handle
        const potTrace = new TraceServer(path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "BP95")
        const buttonAdapter = new PotentiometerToButtonEdgeAdapter("pot", "buttonAdapter")

        await withBus([
            {trace: potTrace, service: SRV_POTENTIOMETER, roleName: "pot"},
            {server: buttonAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name


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
