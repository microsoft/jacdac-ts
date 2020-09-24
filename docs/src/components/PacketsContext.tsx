import React, { createContext, useState } from "react";
import { Packet } from "../../../src/dom/packet";

const maxItems = 100
export interface PacketProps {
    key: number;
    packet: Packet;
    count?: number;
}

export interface PacketsProps {
    packets: PacketProps[],
    addPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    paused: boolean,
    setPaused: (paused: boolean) => void,
    flags: string[],
    setFlags: (kinds: string[]) => void,
    serviceClass?: number,
    setServiceClass?: (serviceClass: number) => void
}

const PacketsContext = createContext<PacketsProps>({
    packets: [],
    addPacket: (pkt) => { },
    clearPackets: () => { },
    paused: false,
    setPaused: (p) => { },
    flags: [],
    setFlags: (k) => { },
    serviceClass: undefined,
    setServiceClass: (srv) => { },
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const [packets, setPackets] = useState<PacketProps[]>([])
    const [paused, setPaused] = useState(false)
    const [flags, setFlags] = useState(["rw", "ro", "event", "command", "report"])
    const [serviceClass, setServiceClass] = useState<number>(undefined)

    const addPacket = (pkt: Packet) => {
        const { key } = pkt
        const old = packets.find(p => p.key == key)
        if (old) {
            old.count++;
            setPackets([...packets])
        }
        else {
            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift({
                key,
                packet: pkt,
                count: 1
            })
            setPackets(ps)
        }
    }
    const clearPackets = () => setPackets([])

    return (
        <PacketsContext.Provider value={{
            packets, addPacket, clearPackets,
            paused, setPaused,
            flags, setFlags,
            serviceClass, setServiceClass
        }}>
            {children}
        </PacketsContext.Provider>
    )
}