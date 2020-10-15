import React, { createContext, useContext, useEffect, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { CHANGE, PACKET_PROCESS, PROGRESS } from "../../../src/dom/constants";
import Trace from "../../../src/dom/trace";
import TracePlayer from "../../../src/dom/traceplayer";
import useDbValue from "./useDbValue"
import TraceRecorder, { TracePacketProps } from "../../../src/dom/tracerecorder"
import { TimestampRange } from "../../../src/dom/packetfilter";



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
    togglePaused: () => void,
    timeRange: TimestampRange,
    setTimeRange: (range: TimestampRange) => void
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
    togglePaused: () => { },
    timeRange: {},
    setTimeRange: (range) => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, recorder, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const [packets, setPackets] = useState<TracePacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const { value: filter, setValue: _setFilter } = useDbValue("packetfilter", "repeated-announce:false")

    const [recording, setRecording] = useState(recorder.recording)
    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [progress, setProgress] = useState(0)
    const [paused, setPaused] = useState(recorder.paused)
    const [timeRange, setTimeRange] = useState<TimestampRange>({})

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
        if (recorder.recording) {
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
    const togglePaused = () => {
        recorder.paused = !recorder.paused;
        setPaused(recorder.paused);
    }
    // update filter
    useEffect(() => {
        let f = filter;
        if (paused) {
            if (timeRange.after !== undefined)
                f += ` after:${timeRange.after}`
            if (timeRange.before !== undefined)
                f += ` before:${timeRange.before}`
        }
        recorder.filter = f
    }, [filter, timeRange, paused]);
    // update trace place when trace is created
    useEffect(() => recorder.subscribe(CHANGE, () => {
        setRecording(recorder.recording);
        const p = !recorder.recording && recorder.trace && new TracePlayer(bus, recorder.trace.packets);
        if (p)
            p.subscribe(PROGRESS, (pr: number) => setProgress(pr))
        setPlayer(p);
        return () => p?.stop();
    }));
    // update packet view
    useEffect(() => recorder.subscribe(TraceRecorder.FILTERED_PACKETS_CHANGE, () => {
        setPackets(recorder.filteredPackets)
    }), [])

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
            paused, togglePaused,
            timeRange, setTimeRange
        }}>
            {children}
        </PacketsContext.Provider>
    )
}