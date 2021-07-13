import { suite, test } from "mocha"

import { PotentiometerToButtonEdgeAdapter } from "../../src/servers/potbuttonadapter"

import {withBus, JDBusTestUtil, TraceServer} from "./tester";

import * as path from 'path';
import { ButtonEdgeEvent, SRV_POTENTIOMETER } from "../../src/jdom/jacdac-jdom";
import { ButtonGestureAdapter } from "../../src/servers/buttongestureadapter";
import assert from "assert";


suite('replay', () => {
    test('replay slider, to button edge', async function() {
        // These are here so we have a handle
        const potTrace = new TraceServer(path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "BP95")
        const buttonAdapter = new PotentiometerToButtonEdgeAdapter("pot", 0.5, "buttonAdapter")

        await withBus([
            {trace: potTrace, service: SRV_POTENTIOMETER, roleName: "pot"},
            {server: buttonAdapter, roleName: "buttonAdapter"},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name
            const buttonService = serviceMap.get(buttonAdapter)  // TODO can this be made automatic so we don't need this?

            assert((await busTest.nextEventWithin(buttonService, {after: 2000, within: 2400}))
                .code == ButtonEdgeEvent.Down)
            assert((await busTest.nextEventWithin(buttonService, {after: 700, within: 1100}))
                .code == ButtonEdgeEvent.Up)

            assert((await busTest.nextEventWithin(buttonService, {after: 900, within: 1300}))
                .code == ButtonEdgeEvent.Down)
            assert((await busTest.nextEventWithin(buttonService, {after: 1200, within: 1600}))
                .code == ButtonEdgeEvent.Up)

            assert((await busTest.nextEventWithin(buttonService, {after: 1000, within: 1400}))
                .code == ButtonEdgeEvent.Down)
            assert((await busTest.nextEventWithin(buttonService, {after: 200, within: 600}))
                .code == ButtonEdgeEvent.Up)
        })
    }).timeout(15000)

    // test('replay slider, full stack with gesture adapter', async function() {
    //     // These are here so we have a handle
    //     const potTrace = new TraceServer(path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "BP95")
    //     const buttonAdapter = new PotentiometerToButtonEdgeAdapter("pot", 0.5, "buttonAdapter")
    //     const gestureAdapter = new ButtonGestureAdapter("buttonAdapter", "gestureAdapter")

    //     await withBus([
    //         {trace: potTrace, service: SRV_POTENTIOMETER, roleName: "pot"},
    //         {server: buttonAdapter, roleName: "buttonAdapter"},
    //         {server: gestureAdapter},
    //     ], async (bus, serviceMap) => {
    //         const busTest = new JDBusTestUtil(bus)  // TODO needs better name

    //         assert((await busTest.nextEventWithin(gestureService, {within: 100})).code == ButtonGestureEvent.Click)

    //         await bus.delay(15000)

    //         console.log(bus.devices().map(device => {
    //             const servicesStr = device.services().map ( service => {
    //                 return `${service.name}=${service.specification.name}`
    //             } )
    //             return `${device.friendlyName}: ${servicesStr}`
    //         }))

    //     })
    // }).timeout(15000)
});
