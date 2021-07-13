import { suite, test } from "mocha"

import { PotentiometerToButtonEdgeAdapter } from "../../src/servers/potbuttonadapter"

import {withBus, JDBusTestUtil, TraceServer} from "./tester";

import * as path from 'path';
import { SRV_POTENTIOMETER } from "../../src/jdom/jacdac-jdom";


suite('replay', () => {
    test('replay slider', async function() {
        // These are here so we have a handle
        const potTrace = new TraceServer(path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "BP95")
        const buttonAdapter = new PotentiometerToButtonEdgeAdapter("pot", 0.5, "buttonAdapter")

        await withBus([
            {trace: potTrace, service: SRV_POTENTIOMETER, roleName: "pot"},
            {server: buttonAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name

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
