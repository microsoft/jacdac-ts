import { suite, test } from "mocha"
import { ButtonEdgeEvent, ButtonGestureEvent, SRV_BUTTON_STREAMING } from "../../src/jdom/constants";

import { ButtonEdgeAdapter, ButtonGestureAdapter } from "../../src/servers/buttongestureadapter"
import { assert } from "../../src/jdom/utils";

import {withBus, JDBusTestUtil} from "./tester";
import SensorServer from "../../src/servers/sensorserver";


suite('button adapters', () => {
    test('edge detect', async function() {
        // These are here so we have a handle
        const buttonServer = new SensorServer<[boolean]>(SRV_BUTTON_STREAMING, 
            {instanceName: "button", readingValues: [false]})  // interface name is just a human-friendly name, not functional
        const edgeAdapter = new ButtonEdgeAdapter("button", "edgeAdapter")

        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: edgeAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name, also boilerplate
            const edgeService = serviceMap.get(edgeAdapter)  // TODO boilerplate, think about how to eliminate

            // This is needed for the edge detector to initialize to the first sample
            // TODO is there a way to register the dependency more accurately?
            await bus.delay(100)

            buttonServer.reading.setValues([true])
            assert((await busTest.nextEventWithin(edgeService, {within: 100})).code == ButtonEdgeEvent.Down)

            buttonServer.reading.setValues([false])
            assert((await busTest.nextEventWithin(edgeService, {within: 100})).code == ButtonEdgeEvent.Up)
        })
    })

    test('whole stack gesture detect', async function() {
        // These are here so we have a handle
        const buttonServer = new SensorServer<[boolean]>(SRV_BUTTON_STREAMING, 
            {instanceName: "button", readingValues: [false]})  // interface name is just a human-friendly name, not functional
        const edgeAdapter = new ButtonEdgeAdapter("button", "edgeAdapter")
        const gestureAdapter = new ButtonGestureAdapter("edgeAdapter", "gestureAdapter")

        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: edgeAdapter, roleName: "edgeAdapter"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name, also boilerplate
            const gestureService = serviceMap.get(gestureAdapter)  // TODO boilerplate, think about how to eliminate

            // This is needed for the edge detector to initialize to the first sample
            // TODO is there a way to register the dependency more accurately?
            await bus.delay(100)

            // Simple click cycle
            buttonServer.reading.setValues([true])
            await bus.delay(100)
            buttonServer.reading.setValues([false])
            // TODO timing here is a total fudge factor, it should be instantaneous
            assert((await busTest.nextEventWithin(gestureService, {within: 100})).code == ButtonGestureEvent.Click)
    
            await bus.delay(300)

            // Test stimulus, click and hold cycle
            buttonServer.reading.setValues([true])
            assert((await busTest.nextEventWithin(gestureService, {after: 200})).code == ButtonGestureEvent.ClickHold)
    
            await bus.delay(300)
            
            buttonServer.reading.setValues([false])
            // TODO timing here is a total fudge factor, it should be instantaneous
            assert((await busTest.nextEventWithin(gestureService, {within: 100})).code == ButtonGestureEvent.HoldRelease)
        })
    })
});
