import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { CHANGE, PROGRESS } from "../../../src/dom/constants";
import Trace from "../../../src/dom/trace";
import TracePlayer from "../../../src/dom/traceplayer";
import useDbValue from "./useDbValue"
import TraceRecorder from "../../../src/dom/tracerecorder"
import { TimestampRange } from "../../../src/dom/packetfilter";
import TraceView, { TracePacketProps } from "../../../src/dom/traceview";

export interface PacketsProps {
    trace: Trace,
    packets: TracePacketProps[],
    selectedPacket: Packet,
    setSelectedPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    filter: string,
    setFilter: (filter: string) => void,
    replayTrace: Trace,
    setReplayTrace: (frames: Frame[], videoUrl?: string) => void,
    recording: boolean,
    toggleRecording: () => void,
    tracing: boolean,
    toggleTracing: () => void,
    progress: number,
    paused: boolean,
    togglePaused: () => void,
    timeRange: TimestampRange,
    setTimeRange: (range: TimestampRange) => void
}

const PacketsContext = createContext<PacketsProps>({
    trace: undefined,
    packets: [],
    selectedPacket: undefined,
    setSelectedPacket: () => { },
    clearPackets: () => { },
    filter: "",
    setFilter: () => { },
    replayTrace: undefined,
    setReplayTrace: () => { },
    recording: false,
    toggleRecording: () => { },
    tracing: false,
    toggleTracing: () => { },
    progress: undefined,
    paused: false,
    togglePaused: () => { },
    timeRange: {},
    setTimeRange: (range) => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { value: filter, setValue: _setFilter } = useDbValue("packetfilter", "repeated-announce:false")

    const recorder = useRef<TraceRecorder>(new TraceRecorder(bus));
    const view = useRef<TraceView>(new TraceView(bus, filter));
    const player = useRef<TracePlayer>(new TracePlayer(bus));

    const [packets, setPackets] = useState<TracePacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [progress, setProgress] = useState(0)
    const [timeRange, setTimeRange] = useState<TimestampRange>({})
    const [recording, setRecording] = useState(false)
    const [trace, setTrace] = useState<Trace>(view.current.trace);
    const [replayTrace, _setReplayTrace] = useState<Trace>(undefined);
    const [tracing, setTracing] = useState(false);
    const [paused, setPaused] = useState(false)

    const clearPackets = () => {
        setSelectedPacket(undefined)
        setProgress(undefined)
        player.current.stop();
        recorder.current.stop();
        view.current.clear();
        bus.clear();
    }
    const setReplayTrace = (pkts: Packet[], videoUrl?: string) => {
        clearPackets();
        if (!pkts?.length)
            player.current.trace = undefined;
        else
            player.current.trace = new Trace(pkts, videoUrl);
    }
    const toggleRecording = () => {
        if (recorder.current.recording) {
            player.current.trace = recorder.current.stop();
        } else {
            player.current.trace = undefined;
            recorder.current.start();
            setProgress(undefined);
        }
    }
    const toggleTracing = () => {
        console.log(`player toggle running ${player.current.running}`)
        if (player.current.running) {
            player.current.stop();
        } else {
            player.current.start();
        }
    }
    const setFilter = (f: string) => {
        _setFilter(f);
    }
    const togglePaused = () => {
        view.current.paused = !view.current.paused;
        if (view.current.paused) {
            recorder.current.stop();
            player.current.stop();
        }
    }
    // update filter in the view
    useEffect(() => {
        let f = filter;
        if (paused) {
            if (timeRange.after !== undefined)
                f += ` after:${timeRange.after}`
            if (timeRange.before !== undefined)
                f += ` before:${timeRange.before}`
        }
        view.current.filter = f
    }, [filter, timeRange, paused]);
    // track state in React
    useEffect(() => view.current.subscribe(CHANGE, () => {
        setPaused(view.current.paused);
        setPackets(view.current.filteredPackets)
        setTrace(view.current.trace);
    }), [])
    useEffect(() => recorder.current.subscribe(CHANGE, () => {
        setRecording(recorder.current.recording);
    }), [])
    useEffect(() => player.current.subscribe(CHANGE, () => {
        setTracing(player.current.running);
        _setReplayTrace(player.current.trace);
    }), [])
    useEffect(() => player.current.subscribe(PROGRESS, () => {
        setProgress(player.current.progress);
    }), [])

    return (
        <PacketsContext.Provider value={{
            trace,
            packets, clearPackets,
            selectedPacket, setSelectedPacket,
            filter, setFilter,
            replayTrace, setReplayTrace,
            recording, toggleRecording,
            tracing, toggleTracing,
            progress,
            paused, togglePaused,
            timeRange, setTimeRange
        }}>
            {children}
        </PacketsContext.Provider>
    )
}