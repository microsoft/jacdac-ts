import { JDBus } from "../../src/jdom/bus"
import { BusTester } from "../../src/tstester/testwrappers"
import { FastForwardScheduler } from "./scheduler"

export class FastForwardBusTester extends BusTester {
    // Unlike BusTester, we initialize a bus here so it uses the FF scheduler
    constructor() {
        super(new JDBus([], {
            scheduler: new FastForwardScheduler
        }))
    }

    // TODO can this be a block / scoped API?
    public start() {
        this.bus.start()
    }

    public stop() {
        this.bus.stop()
    }

}
