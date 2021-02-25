import { loadServiceSpecifications } from "../src/jdom/spec";
import { readFileSync } from "fs"
import { JDBus } from "../src/jdom/bus";
import Packet from "../src/jdom/packet";

let specs: any;
export function loadSpecifications() {
    if (!specs) {
        specs = JSON.parse(readFileSync("../jacdac-spec/dist/services.json", { encoding: "utf-8" }))
        loadServiceSpecifications(specs as any)    
    }
}

export function mkBus() {
    loadSpecifications();
    return new JDBus({
        sendPacketAsync: async (pkt: Packet) => {
            console.log(`pkt`, { pkt })
        }
    }, {});
}

loadSpecifications();