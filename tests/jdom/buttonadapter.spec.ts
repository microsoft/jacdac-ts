import { suite, test } from "mocha"
import { ButtonEdgeEvent, SRV_BUTTON_STREAMING } from "../../src/jdom/constants";

import { ButtonEdgeAdapter } from "../../src/servers/buttongestureadapter"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil} from "./tester";
import SensorServer from "../../src/servers/sensorserver";


suite('button adapters', () => {
    test('click detect event', async function() {
        // These are here so we have a handle
        const buttonServer = new SensorServer<[boolean]>(SRV_BUTTON_STREAMING, 
            {instanceName: "button", readingValues: [false]})  // interface name is just a human-friendly name, not functional
        const edgeAdapter = new ButtonEdgeAdapter("button", "edgeAdapter")

        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: edgeAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name
            const edgeService = serviceMap.get(edgeAdapter)  // TODO can this be made automatic so we don't need this?

            // This is needed for the edge detector to initialize to the first sample
            // TODO is there a way to register the dependency more accurately?
            await bus.delay(100)

            buttonServer.reading.setValues([true])
            assert((await busTest.nextEventWithin(edgeService, {within: 100})).code == ButtonEdgeEvent.Down)

            buttonServer.reading.setValues([false])
            assert((await busTest.nextEventWithin(edgeService, {within: 100})).code == ButtonEdgeEvent.Up)
        })
    }).timeout(5000)
});
