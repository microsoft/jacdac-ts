/// <reference path="../../dist/types/src/jdom/jacdac-jdom.d.ts" />

import { suite, test, afterEach } from "mocha"
import {
    JDBus, Packet, SELF_ANNOUNCE
} from "../../dist/jacdac-jdom.cjs";

function mkBus() {
    return new JDBus({
        sendPacketAsync: (pkt: Packet) => {
            console.log(`pkt`, { pkt })
        }
    }, {});
}

suite('bus', () => {
    let bus: JDBus;
    afterEach(() => bus?.stop())

    test('self announce', function(done) {
        bus = mkBus();
        bus.on(SELF_ANNOUNCE, () => {
            done()
            bus.stop();
        });
    })
});
