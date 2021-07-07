import { suite, test } from "mocha"
import { ButtonGestureEvent, PACKET_SEND, REPORT_UPDATE, SystemReg } from "../../src/jdom/constants";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { assert } from "../../src/jdom/utils";
import Packet from "../../src/jdom/packet";

import {withBus, JDBusTestUtil} from "./tester";


suite('adapters', () => {
    test('click detect event', async function() {
        // These are here so we have a handle
        const buttonServer = new ButtonServer("button")  // interface name is just a human-friendly name, not functional
        const gestureAdapter = new ButtonGestureAdapter("button", "gestureAdapter")

        await withBus([
            {server: buttonServer, roleName: "button"},
            {server: gestureAdapter},
        ], async (bus, serviceMap) => {
            const busTest = new JDBusTestUtil(bus)  // TODO needs better name
            const gestureService = serviceMap.get(gestureAdapter)  // TODO can this be made automatic so we don't need this?

            
            // TODO TEST CODE
            const buttonService = serviceMap.get(buttonServer)
            buttonService.register(SystemReg.Reading).on(REPORT_UPDATE, () => {})
            bus.on(PACKET_SEND, (packet: Packet) => {
                if (packet.registerIdentifier == buttonServer.reading.identifier) {
                    console.log(`button server snd  ${packet.registerIdentifier}  ${packet}`)
                }
            })


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
