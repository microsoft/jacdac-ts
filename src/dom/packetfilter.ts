import { JDBus } from "./bus";
import Packet from "./packet";
import { serviceSpecificationFromName } from "./spec";

export function parsePacketFilter(bus: JDBus, text: string) {
    let filters: ((pkt: Packet) => boolean)[] = [];
    let flags = new Set<string>()
    let serviceClasses = new Set<number>();
    let devices = new Set<string>();
    let skipRepeatedAnounce = true;
    text.split(/\s+/g).forEach(part => {
        const [match, prefix, _, value] = /([a-z]+)(:([^\s]+))?/.exec(part) || [];
        switch (prefix || "") {
            case "kind":
            case "k":
                if (!value) return;

                flags.add(value.toLowerCase())
                break;
            case "service":
            case "srv":
                if (!value) return;

                const service = serviceSpecificationFromName(value)
                const serviceClass = service?.classIdentifier || parseInt(value);
                if (serviceClass !== undefined)
                    serviceClasses.add(serviceClass)
                break;
            case "announce":
            case "a":
                skipRepeatedAnounce = false;
                break;
            case "device":
            case "dev":
                if (!value) return;

                const deviceId = parseInt(value)
                if (!isNaN(deviceId))
                    devices.add(value)
                else {
                    // resolve device by name
                    const dev = bus.devices().find(d => d.shortId === value || d.name === name);
                    if (dev)
                        devices.add(dev.deviceId);
                }
        }
    });

    let normalized: string[] = []
    if (!skipRepeatedAnounce) {
        filters.push(pkt => !pkt.isRepeatedAnnounce)
        normalized.push("announce")
    }
    if (serviceClasses.size) {
        const scs = Array.from(serviceClasses.keys());
        normalized = normalized.concat(scs.map(sc => `srv:${sc.toString(16)}`))
        filters.push(pkt => scs.some(serviceClass => isInstanceOf(pkt.service_class, serviceClass)));
    }
    if (flags.size) {
        normalized = normalized.concat(Array.from(flags).map(flag => `kind:${flag}`))
        filters.push(pkt => hasAnyFlag(pkt))
    }
    if (devices.size)
        filters.push(pkt => devices.has(pkt.device_identifier))

    return {
        normalized: normalized.join(" "),
        filter: (pkt: Packet) => filters.every(filter => filter(pkt))
    }

    function hasAnyFlag(pkt: Packet) {
        const k = pkt.decoded?.info.kind;
        return k && flags.has(k);
    }
}