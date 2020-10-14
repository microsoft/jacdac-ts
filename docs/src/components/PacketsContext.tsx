import React, { createContext, useContext, useEffect, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { CHANGE, PACKET_PROCESS, PROGRESS } from "../../../src/dom/constants";
import Trace from "../../../src/dom/trace";
import TracePlayer from "../../../src/dom/traceplayer";
import useDbValue from "./useDbValue"
import TraceRecorder, { TracePacketProps } from "../../../src/dom/tracerecorder"



export interface PacketsProps {
    packets: TracePacketProps[],
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
    progress: number,
    paused: boolean,
    togglePaused: () => void
}

const PacketsContext = createContext<PacketsProps>({
    packets: [],
    selectedPacket: undefined,
    setSelectedPacket: () => { },
    clearPackets: () => { },
    filter: "",
    setFilter: () => { },
    trace: undefined,
    setTrace: () => { },
    recording: false,
    toggleRecording: () => { },
    tracing: false,
    toggleTrace: () => { },
    progress: undefined,
    paused: false,
    togglePaused: () => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, recorder, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const [packets, setPackets] = useState<TracePacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const { value: filter, setValue: _setFilter } = useDbValue("packetfilter", "repeated-announce:false")

    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [progress, setProgress] = useState(0)
    const [paused, setPaused] = useState(false)

    const { recording } = recorder;

    const clearPackets = () => {
        setSelectedPacket(undefined)
        setProgress(undefined)
        bus.clear();
        recorder.clear();
    }
    const setTrace = async (pkts: Packet[], videoUrl?: string) => {
        if (!pkts?.length) return;

        clearPackets();
        recorder.replayTrace = new Trace(pkts, videoUrl)
    }
    const toggleRecording = async () => {
        if (recording) {
            recorder.stopRecording();
        } else {
            recorder.startRecording();
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
    const setFilter = (f: string) => {
        _setFilter(f);
    }
    const togglePaused = () => setPaused(!paused);
    // update filter
    useEffect(() => { recorder.filter = filter }, [filter]);
    // update trace place when trace is created
    useEffect(() => recorder.subscribe(CHANGE, () => {
        const p = !recorder.recording && recorder.trace && new TracePlayer(bus, recorder.trace.packets);
        if (p)
            p.subscribe(PROGRESS, (pr: number) => setProgress(pr))
        setPlayer(p);
        return () => p?.stop();
    }));
    // update packet view
    useEffect(() => recorder.subscribe(TraceRecorder.FILTERED_PACKETS_CHANGE, () => {
        if (!paused)
            setPackets(recorder.filteredPackets)
    }))
    // update packets
    useEffect(() => {
        if (paused)
            setPackets(packets.slice(0));
        else
            setPackets(recorder.filteredPackets)
    }, [paused])

    return (
        <PacketsContext.Provider value={{
            packets, clearPackets,
            selectedPacket, setSelectedPacket,
            filter, setFilter,
            trace: recorder.trace, setTrace,
            recording, toggleRecording,
            tracing: !!player?.running,
            toggleTrace,
            progress,
            paused, togglePaused
        }}>
            {children}
        </PacketsContext.Provider>
    )
}