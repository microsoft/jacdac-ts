import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import { SELF_ANNOUNCE } from "../../src/jdom/constants";
import { mkBus } from "../testutils";


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
