import React, { createContext, useContext, useEffect, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import { DecodedPacket } from "../../../src/dom/pretty";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { PACKET_PROCESS, PACKET_SEND, PROGRESS } from "../../../src/dom/constants";
import { throttle } from "../../../src/dom/utils";
import { isInstanceOf } from "../../../src/dom/spec";
import TracePlayer from "../../../src/dom/traceplayer";

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
    selectedPacket: Packet,
    setSelectedPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    flags: string[],
    setFlags: (kinds: string[]) => void,
    serviceClass?: number,
    setServiceClass?: (serviceClass: number) => void,
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
    flags: [],
    setFlags: () => { },
    serviceClass: undefined,
    setServiceClass: () => { },
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
    const { bus, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const [packets, setPackets] = useState<PacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [flags, setFlags] = useState(["report", "rw", "ro", "event", "command", "const"])
    const [serviceClass, setServiceClass] = useState<number>(undefined)

    const [replayTrace, setReplayTrace] = useState<Trace>(undefined)
    const [recordingTrace, setRecordingTrace] = useState<Trace>(undefined)

    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [progress, setProgress] = useState(0)

    const recording = !!recordingTrace;
    const hasFlag = (k: string) => flags.indexOf(k) > -1
    const skipRepeatedAnnounce = !hasFlag("announce");
    const throttledSetPackets = throttle(() => {
        const ps = packets.slice(0,
            packets.length < PACKET_MAX_ITEMS
                ? packets.length : PACKET_MAX_ITEMS);
        setPackets(ps);
    }, 200);

    const clearPackets = () => {
        setPackets([])
        setSelectedPacket(undefined)
        bus.clear();
    }
    const addPacket = (pkt: Packet) => {
        // don't repeat announce
        if (skipRepeatedAnnounce && pkt.isRepeatedAnnounce)
            return;
        // not matching service class
        if (serviceClass !== undefined && !isInstanceOf(pkt.service_class, serviceClass))
            return;

        const decoded = pkt.decoded;
        if (decoded && !hasFlag(decoded.info.kind)) {
            //console.log(`ignore ${decoded.info.kind}`)
            return; // ignore packet type
        }
        const { key } = pkt;
        const old = packets.find(p => p.key == key)
        if (old) {
            old.count++;
            setPackets([...packets])
        }
        else {
            packets.unshift({
                key,
                packet: pkt,
                decoded: pkt.decoded,
                count: 1
            })
        }
        // eventually refresh ui
        throttledSetPackets();
    }
    const setTrace = async (pkts: Packet[], videoUrl?: string) => {
        if (!pkts?.length) return;

        clearPackets();
        setRecordingTrace(undefined);
        setReplayTrace({
            packets: pkts,
            videoUrl,
        });
    }
    const toggleRecording = () => {
        if (recording) {
            setReplayTrace(recordingTrace)
            setRecordingTrace(undefined)
        } else {
            setRecordingTrace({ packets: [] })
            setReplayTrace(undefined);
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
            recordingTrace?.packets.push(pkt)
            // add packet to live list
            addPacket(pkt);
        }), [recordingTrace]);
    // reset packets when filters change
    useEffect(() => {
        clearPackets()
    }, [flags.join(',')])
    useEffect(() => {
        const p = replayTrace && new TracePlayer(bus, replayTrace?.packets);
        setPlayer(p);
        return () => p?.stop();
    }, [replayTrace]);
    useEffect(() => player?.subscribe(PROGRESS, (p: number) => setProgress(p))
        , [player]);
    return (
        <PacketsContext.Provider value={{
            packets, clearPackets,
            selectedPacket, setSelectedPacket,
            flags, setFlags,
            serviceClass, setServiceClass,
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