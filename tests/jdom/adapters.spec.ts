import { suite, test, afterEach } from "mocha"
import { JDBus } from "../../src/jdom/bus"
import JDServiceProvider from "../../src/jdom/serviceprovider"
import { SELF_ANNOUNCE, EVENT, SRV_BUTTON } from "../../src/jdom/constants";
import { mkBus } from "../testutils";

import ButtonGestureAdapter from "../../src/servers/buttongestureadapter"
import ButtonServer from "../../src/servers/buttonserver"
import { startServiceProviderFromServiceClass  } from "../../src/servers/servers"
import { JDEvent } from "../../src/jdom/event";

suite('bus', () => {
    let bus: JDBus;

    afterEach(() => bus?.stop())

        bus = mkBus();
        console.log("bus created")

        setTimeout(() => {  // wait for bus to initialize
            // startServiceProviderFromServiceClass(bus, SRV_BUTTON)
            const options = {
                resetIn: false,
            }
            const buttonServer = new ButtonServer("B0")
            bus.addServiceProvider(new JDServiceProvider([buttonServer], options))

            console.log("start button")

            setTimeout(() => {
                const button = bus.services({serviceClass: SRV_BUTTON})[0]

                button.on(EVENT, (evs: JDEvent[]) => {
                    // console.log(evs)
                    console.log(evs[0].code)
                    console.log(evs[0].name)
                })
                buttonServer.down()
                console.log("down")

                setTimeout(() => {
                    buttonServer.up()
                    console.log("up")

                    setTimeout(() => { done() }, 250)
                }, 250)
            }, 250)
            
        }, 250);
    })
});
