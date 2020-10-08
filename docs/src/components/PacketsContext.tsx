import React, { createContext, useContext, useEffect, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import { DecodedPacket } from "../../../src/dom/pretty";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
import { PACKET_PROCESS, PACKET_SEND } from "../../../src/dom/constants";

const PACKET_MAX_ITEMS = 500
export interface PacketProps {
    key: number;
    packet: Packet;
    decoded: DecodedPacket;
    count?: number;
}

export interface Trace {
    packets: Packet[];
    videoUrl?: string;
}

export interface PacketsProps {
    packets: PacketProps[],
    addPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    selectedPacket: Packet,
    setSelectedPacket: (pkt: Packet) => void,
    flags: string[],
    setFlags: (kinds: string[]) => void,
    serviceClass?: number,
    setServiceClass?: (serviceClass: number) => void,
    trace: Trace,
    setTrace: (frames: Frame[], videoUrl?: string) => void,
    recording: boolean,
    toggleRecording: () => void
}

const PacketsContext = createContext<PacketsProps>({
    packets: [],
    addPacket: (pkt) => { },
    clearPackets: () => { },
    selectedPacket: undefined,
    setSelectedPacket: (pkt) => { },
    flags: [],
    setFlags: (k) => { },
    serviceClass: undefined,
    setServiceClass: (srv) => { },
    trace: undefined,
    setTrace: (frames, videoUrl) => { },
    recording: false,
    toggleRecording: () => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, connectionState, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const [packets, setPackets] = useState<PacketProps[]>([])
    const [flags, setFlags] = useState(["report", "rw", "ro", "event", "command", "const"])
    const [serviceClass, setServiceClass] = useState<number>(undefined)
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [trace, _setTrace] = useState<Trace>(undefined)
    const [recording, setRecording] = useState(false)

    // recording packets
    useEffect(() => {
        if (!recording)
            return () => { }
        else
            return bus.subscribe([PACKET_PROCESS, PACKET_SEND],
                (pkt: Packet) => trace.packets.push(pkt));
    }, [recording]);

    const addPacket = (pkt: Packet) => {
        const { key } = pkt
        const old = packets.find(p => p.key == key)
        if (old) {
            old.count++;
            setPackets([...packets])
        }
        else {
            const ps = packets.slice(0, packets.length < PACKET_MAX_ITEMS ? packets.length : PACKET_MAX_ITEMS)
            ps.unshift({
                key,
                packet: pkt,
                decoded: pkt.decoded,
                count: 1
            })
            setPackets(ps)
        }
    }
    const clearPackets = () => {
        setPackets([])
        setSelectedPacket(undefined)
        bus.clear();
    }
    const setTrace = async (pkts: Packet[], videoUrl?: string) => {
        if (!pkts?.length)
            _setTrace(undefined);
        else {
            clearPackets();
            bus.clear();
            _setTrace({
                packets: pkts,
                videoUrl,
            });
        }
    }
    const toggleRecording = () => {
        if (recording) {
            setRecording(false)
        } else {
            _setTrace({
                packets: []
            })
            setRecording(true);
        }
    }

    return (
        <PacketsContext.Provider value={{
            packets, addPacket, clearPackets,
            selectedPacket, setSelectedPacket,
            flags, setFlags,
            serviceClass, setServiceClass,
            trace, setTrace,
            recording, toggleRecording
        }}>
            {children}
        </PacketsContext.Provider>
    )
}