import { SRV_LOGGER } from "../../jacdac-spec/dist/specconstants";
import { JDBus } from "./bus";
import Packet from "./packet";
import { isCommand, isInstanceOf, serviceSpecificationFromName } from "./spec";
import { SMap } from "./utils";

export type CompiledPacketFilter = (pkt: Packet) => boolean;

export interface PacketFilterProps {
    announce?: boolean,
    repeatedAnnounce?: boolean,
    requiresAck?: boolean,
    log?: boolean,
    firmwareIdentifiers?: number[],
    flags?: string[],
    regGet?: boolean,
    regSet?: boolean,
    devices?: SMap<{ from?: boolean; to?: boolean }>,
    serviceClasses?: number[],
    pkts?: string[],
    before?: number,
    after?: number,
    grouping?: boolean,
    pipes?: boolean,
    port?: number,
    collapseAck?: boolean,
    collapsePipes?: boolean,
}

export interface PacketFilter {
    source: string;
    props: PacketFilterProps;
    filter: CompiledPacketFilter;
}

export function parsePacketFilter(bus: JDBus, text: string): PacketFilter {
    if (!text) {
        return {
            source: text,
            props: {
                grouping: true
            },
            filter: (pkt) => true
        }
    }

    let flags = new Set<string>()
    let serviceClasses = new Set<number>();
    let pkts = new Set<string>();
    let firmwares = new Set<number>();
    let repeatedAnnounce = undefined;
    let announce = undefined;
    let regGet = undefined;
    let regSet = undefined;
    let requiresAck = undefined;
    let log = undefined;
    let before = undefined;
    let after = undefined;
    let devices: SMap<{ from: boolean; to: boolean; }> = {};
    let grouping = true;
    let pipes = undefined;
    let port: number = undefined;
    let collapseAck: boolean = true;
    let collapsePipes: boolean = true;
    text.split(/\s+/g).forEach(part => {
        const [match, prefix, _, value] = /([a-z\-_]+)([:=]([^\s]+))?/.exec(part) || [];
        switch (prefix || "") {
            case "kind":
            case "k":
                if (!value)
                    break;
                flags.add(value.toLowerCase())
                break;
            case "service":
            case "srv":
                if (!value)
                    break;
                const service = serviceSpecificationFromName(value)
                const serviceClass = service?.classIdentifier || parseInt(value, 16);
                if (serviceClass !== undefined && !isNaN(serviceClass))
                    serviceClasses.add(serviceClass)
                break;
            case "announce":
            case "a":
                announce = parseBoolean(value);
                break;
            case "repeated-announce":
            case "ra":
                repeatedAnnounce = parseBoolean(value);
                break;
            case "requires-ack":
            case "ack":
                requiresAck = parseBoolean(value);
                break;
            case "collapse-ack":
                collapseAck = parseBoolean(value);
                break;
            case "device":
            case "dev":
            case "to":
            case "from":
                if (!value)
                    break;
                // resolve device by name
                const deviceId = bus.devices().find(d => d.shortId === value || d.name === value)?.deviceId;
                if (deviceId) {
                    const data = devices[deviceId] || (devices[deviceId] = { from: false, to: false })
                    if (prefix === "from")
                        data.from = true;
                    else if (prefix === "to")
                        data.to = true;
                }
                break;
            case "fw":
            case "firmware-identifier":
                if (!value) return;
                // find register
                const fwid = parseInt(value.replace(/^0?x/, ''), 16);
                if (!isNaN(fwid))
                    firmwares.add(fwid);
                break;
            case "pkt":
            case "reg":
            case "register":
            case "cmd":
            case "command":
            case "ev":
            case "event":
                if (!value) return;
                // find register
                const id = parseInt(value.replace(/^0?x/, ''), 16);
                if (!isNaN(id))
                    pkts.add(id.toString(16));
                // support name
                pkts.add(value);
                break;
            case "reg-get":
            case "get":
                regGet = true;
                break;
            case "reg-set":
            case "set":
                regSet = true;
                break;
            case "log":
                log = true;
                break;
            case "before":
                before = parseTimestamp(value);
                break;
            case "after":
                after = parseTimestamp(value);
                break;
            case "grouping":
                grouping = parseBoolean(value);
                break;
            case "pipes":
                pipes = parseBoolean(value);
                break;
            case "collapse-pipes":
                collapsePipes = parseBoolean(value);
                break;
            case "port":
                port = parseInt(value);
                break;
        }
    });

    const props = {
        announce,
        repeatedAnnounce,
        requiresAck,
        collapseAck,
        log,
        firmwareIdentifiers: !!firmwares.size && Array.from(firmwares.keys()),
        flags: !!flags.size && Array.from(flags.keys()),
        regGet,
        regSet,
        devices,
        serviceClasses: !!serviceClasses.size && Array.from(serviceClasses.keys()),
        pkts: !!pkts.size && Array.from(pkts.keys()),
        before,
        after,
        grouping,
        pipes,
        collapsePipes,
        port
    }
    const filter = compileFilter(props)
    return {
        source: text,
        props,
        filter,
    };
    function parseBoolean(value: string) {
        if (value === "false" || value === "no")
            return false;
        else if (value === "true" || value === "yes" || !value)
            return true;
        else
            return undefined;
    }
    function parseTimestamp(value: string) {
        const t = parseInt(value);
        return isNaN(t) ? undefined : t;
    }
}

export function compileFilter(props: PacketFilterProps) {
    const {
        announce,
        repeatedAnnounce,
        requiresAck,
        log,
        firmwareIdentifiers,
        flags,
        regGet,
        regSet,
        devices,
        serviceClasses,
        pkts,
        before,
        after,
        pipes,
        port
    } = props;

    let filters: CompiledPacketFilter[] = [];
    if (before !== undefined)
        filters.push(pkt => pkt.timestamp <= before)
    if (after !== undefined)
        filters.push(pkt => pkt.timestamp >= after)
    if (announce !== undefined)
        filters.push(pkt => pkt.isAnnounce === announce)
    if (repeatedAnnounce !== undefined)
        filters.push(pkt => !pkt.isAnnounce || (pkt.isRepeatedAnnounce === repeatedAnnounce))
    if (requiresAck !== undefined)
        filters.push(pkt => pkt.requiresAck === requiresAck);
    if (flags)
        filters.push(pkt => hasAnyFlag(pkt))
    if (pipes !== undefined)
        filters.push(pkt => pkt.isPipe)
    if (port !== undefined)
        filters.push(pkt => pkt.pipePort === port);

    if (regGet !== undefined || regSet !== undefined)
        filters.push(pkt => (pkt.isRegisterGet === regGet) || (pkt.isRegisterSet === regSet))
    else if (regGet !== undefined)
        filters.push(pkt => pkt.isRegisterGet === regGet)
    else if (regSet !== undefined)
        filters.push(pkt => pkt.isRegisterSet === regSet)

    if (log !== undefined)
        filters.push(pkt => pkt.service_class === SRV_LOGGER && pkt.isReport);
    if (Object.keys(devices).length)
        filters.push(pkt => {
            if (!pkt.device) return false;
            const f = devices[pkt.device.deviceId];
            return !!f && (!f.from || !pkt.isCommand) && (!f.to || pkt.isCommand);
        })
    if (serviceClasses) {
        filters.push(pkt => serviceClasses.some(serviceClass => isInstanceOf(pkt.service_class, serviceClass)));
    }
    if (pkts) {
        filters.push(pkt => pkts.indexOf(pkt.decoded?.info.identifier.toString(16)) > -1
            || pkts.indexOf(pkt.decoded?.info.name) > -1);
    }
    if (firmwareIdentifiers)
        filters.push(pkt => {
            const fwid = pkt.device?.firmwareIdentifier;
            return fwid === undefined || firmwareIdentifiers.indexOf(fwid) > -1;
        })

    const filter: CompiledPacketFilter = (pkt: Packet) => filters.every(filter => filter(pkt));
    return filter;

    function hasAnyFlag(pkt: Packet) {
        const k = pkt.decoded?.info.kind;
        return !!k && flags.indexOf(k) > -1;
    }
}
