import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import { DecodedPacket } from "../../../src/dom/pretty";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { PACKET_PROCESS, PACKET_SEND, PROGRESS } from "../../../src/dom/constants";
import { throttle, unique } from "../../../src/dom/utils";
import Trace from "../../../src/dom/trace";
import TracePlayer from "../../../src/dom/traceplayer";
import { PacketFilter, parsePacketFilter } from "../../../src/dom/packetfilter";

const PACKET_MAX_ITEMS = 500
const RECORDING_TRACE_MAX_ITEMS = 100000;
export interface PacketProps {
    key: number;
    packet: Packet;
    decoded: DecodedPacket;
    count?: number;
}

export interface PacketsProps {
    packets: PacketProps[],
    selectedPacket: Packet,
    setSelectedPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    filter: string,
    setFilter: (filter: string) => void,
    trace: Trace,
    setTrace: (frames: Frame[], videoUrl?: string) => void,
    recording: boolean,
    toggleRecording: () => void,
    tracing: boolean,
    toggleTrace: () => void,
    progress: number
}

const PacketsContext = createContext<PacketsProps>({
    packets: [],
    selectedPacket: undefined,
    setSelectedPacket: () => { },
    clearPackets: () => { },
    filter: "",
    setFilter: (filter: string) => { },
    trace: undefined,
    setTrace: () => { },
    recording: false,
    toggleRecording: () => { },
    tracing: false,
    toggleTrace: () => { },
    progress: undefined
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, disconnectAsync, connectAsync } = useContext<JDContextProps>(JACDACContext)
    const [packets, setPackets] = useState<PacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [filter, setFilter] = useState("")
    const packetFilter = useRef<PacketFilter>(parsePacketFilter(bus, filter).filter)

    const [replayTrace, setReplayTrace] = useState<Trace>(undefined)
    const [recordingTrace, setRecordingTrace] = useState<Trace>(undefined)

    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [progress, setProgress] = useState(0)

    const recording = !!recordingTrace;
    const throttledSetPackets = throttle(() => {
        const ps = packets.slice(0,
            packets.length < PACKET_MAX_ITEMS
                ? packets.length : PACKET_MAX_ITEMS);
        setPackets(ps);
    }, 200);

    const clearPackets = () => {
        setPackets([])
        setSelectedPacket(undefined)
        setProgress(undefined)
        bus.clear();
    }
    const addPacket = (pkt: Packet, skipSetState = false) => {
        // apply filter
        if (packetFilter.current && !packetFilter.current(pkt))
            return;

        // detect duplicate at the tail of the packets
        const { key } = pkt;
        const old = packets.slice(-15).find(p => p.key == key)
        if (old)
            old.count++;
        else {
            packets.unshift({
                key,
                packet: pkt,
                decoded: pkt.decoded,
                count: 1
            })
        }
        // eventually refresh ui
        if (!skipSetState)
            throttledSetPackets();
    }
    const setTrace = async (pkts: Packet[], videoUrl?: string) => {
        if (!pkts?.length) return;

        clearPackets();
        setRecordingTrace(undefined);
        setReplayTrace(new Trace(pkts, videoUrl))
    }
    const toggleRecording = async () => {
        if (recording) {
            setReplayTrace(recordingTrace)
            setRecordingTrace(undefined)
        } else {
            await connectAsync()
            setRecordingTrace(new Trace([]))
            setReplayTrace(undefined);
            setProgress(undefined);
        }
    }
    const toggleTrace = async () => {
        if (player?.running) {
            player?.stop();
        } else {
            await disconnectAsync();
            setProgress(undefined);
            clearPackets();
            player?.start();
        }
    }
    // recording packets
    useEffect(() => bus.subscribe([PACKET_PROCESS, PACKET_SEND],
        (pkt: Packet) => {
            // record all packets if recording
            if (recordingTrace) {
                recordingTrace.packets.push(pkt)
                if (recordingTrace.packets.length > RECORDING_TRACE_MAX_ITEMS * 1.1) { // 10% overshoot of max
                    recordingTrace.packets = recordingTrace.packets.slice(-RECORDING_TRACE_MAX_ITEMS)
                }
            }
            // add packet to live list
            addPacket(pkt);
        }), [recordingTrace, packetFilter, packets]);
    // reset filter
    useEffect(() => {
        const { filter: pf, normalized } = parsePacketFilter(bus, filter)
        console.log(`packet filter: ${filter} -> ${normalized}`, pf)
        packetFilter.current = pf
    }, [filter]);
    // reset packets when filters change
    useEffect(() => {
        console.log(`refresh filter`)
        // clear existing packets
        while (packets.length)
            packets.pop();
        // run trace
        const trace = replayTrace || recordingTrace
        if (trace)
            for (let i = trace.packets.length - 1; i >= 0 && packets.length <= PACKET_MAX_ITEMS; i--) {
                addPacket(trace.packets[i], true)
            }
        // update ui
        throttledSetPackets();
    }, [packetFilter])
    // update trace place when trace is created    
    useEffect(() => {
        const p = replayTrace && new TracePlayer(bus, replayTrace?.packets);
        p?.subscribe(PROGRESS, (pr: number) => setProgress(pr))
        setPlayer(p);
        setProgress(undefined)
        return () => p?.stop();
    }, [replayTrace]);

    return (
        <PacketsContext.Provider value={{
            packets, clearPackets,
            selectedPacket, setSelectedPacket,
            filter, setFilter,
            trace: replayTrace || recordingTrace, setTrace,
            recording, toggleRecording,
            tracing: !!player?.running,
            toggleTrace,
            progress: progress
        }}>
            {children}
        </PacketsContext.Provider>
    )
}