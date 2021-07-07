import { suite, test } from "mocha"
import { ButtonGestureEvent, PACKET_SEND, REPORT_UPDATE, SystemReg } from "../../src/jdom/constants";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";
import Packet from "../../src/jdom/packet";

import {withBus, JDBusTestUtil} from "./tester";

import * as fs from 'fs';
import * as path from 'path';
import { parseTrace } from "../../src/jdom/logparser";


suite('adapters', () => {
    test('replay slider', async function() {
        // TODO this needs to be cleaned up to avoid this much boilerplate on every test
        const trace = parseTrace(fs.readFileSync(
            path.join(__dirname, "BP95_pot_slow_slow_fast_fast.txt"), "utf-8").toString())

        console.log(trace)

        // These are here so we have a handle
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")

        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name

        })
    }).timeout(5000)
});
