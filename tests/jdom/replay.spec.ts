import { suite, test } from "mocha"

import { PotentiometerToButtonEdgeAdapter } from "../../src/servers/potbuttonadapter"

import {withBus, JDBusTestUtil, TraceServer} from "./tester";

import * as path from 'path';
import { ButtonEdgeEvent, ButtonGestureEvent, SRV_POTENTIOMETER } from "../../src/jdom/jacdac-jdom";
import { ButtonGestureAdapter } from "../../src/servers/buttongestureadapter";
import { assert } from "../../src/jdom/utils";  // TODO another assertion library?


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

            const timeOffset = bus.timestamp  // TODO this is ugly, but needed to account for the ~500ms of setup time
            // TODO remove after simulator time is a thing

            // TODO specify as after (center) with tolerance?
            assert((await busTest.nextEventWithin(buttonService, {after: 2000 - timeOffset, within: 2400}))
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
    }).timeout(10000)

    test('replay slider, full stack with gesture adapter', async function() {
        // These are here so we have a handle
        const potTrace = new TraceServer(path.join(__dirname, "BP95_pot_join_slow_slow_fast_fast.txt"), "BP95")
        const buttonAdapter = new PotentiometerToButtonEdgeAdapter("pot", 0.5, "buttonAdapter")
        const gestureAdapter = new ButtonGestureAdapter("buttonAdapter", "gestureAdapter", 500)
        // use a longer click timeout to force detection

        await withBus([
            {trace: potTrace, service: SRV_POTENTIOMETER, roleName: "pot"},
            {server: buttonAdapter, roleName: "buttonAdapter"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name
            const gestureService = serviceMap.get(gestureAdapter)  // TODO can this be made automatic so we don't need this?

            const timeOffset = bus.timestamp  // TODO this is ugly, but needed to account for the ~500ms of setup time
            // TODO remove after simulator time is a thing

            assert((await busTest.nextEventWithin(gestureService, {after: 2000 - timeOffset, within: 2400 + 500}))
                .code == ButtonGestureEvent.ClickHold)
            assert((await busTest.nextEventWithin(gestureService, {after: 700 - 500, within: 1100 - 500}))
                .code == ButtonGestureEvent.HoldRelease)

            assert((await busTest.nextEventWithin(gestureService, {after: 900, within: 1300 + 500}))
                .code == ButtonGestureEvent.ClickHold)
            assert((await busTest.nextEventWithin(gestureService, {after: 1200 - 500, within: 1600 - 500}))
                .code == ButtonGestureEvent.HoldRelease)

            assert((await busTest.nextEventWithin(gestureService, {after: 900, within: 1300 + 500}))
                .code == ButtonGestureEvent.Click)
        })
    }).timeout(10000)
});
