import { suite, test } from "mocha"
import { ButtonGestureEvent } from "../../src/jdom/constants";

import { LegacyButtonEdgeAdapter, ButtonGestureAdapter } from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil} from "./tester";


suite('legacy button adapters', () => {
    test('click detect event', async function() {
        // These are here so we have a handle
        const buttonServer = new ButtonServer("legacyButton")  // interface name is just a human-friendly name, not functional
        const buttonAdapter = new LegacyButtonEdgeAdapter("legacyButton", "button")
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")

        await withBus([
            {server: buttonServer, roleName: "legacyButton"},
            {server: buttonAdapter, roleName: "button"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name
            const gestureService = serviceMap.get(gestureAdapter)  // TODO can this be made automatic so we don't need this?

            // Simple test stimulus, click cycle
            buttonServer.down()
            await bus.delay(100)
            buttonServer.up()
            // TODO timing here is a total fudge factor, it should be instantaneous
            assert((await busTest.nextEventWithin(gestureService, {within: 100})).code == ButtonGestureEvent.Click)
    
            await bus.delay(300)
    
            // Test stimulus, click and hold cycle
            buttonServer.down()
            assert((await busTest.nextEventWithin(gestureService, {after: 200})).code == ButtonGestureEvent.ClickHold)
    
            await bus.delay(300)
            
            buttonServer.up()
            // TODO timing here is a total fudge factor, it should be instantaneous
            assert((await busTest.nextEventWithin(gestureService, {within: 100})).code == ButtonGestureEvent.HoldRelease)
        })
    }).timeout(5000)
});
