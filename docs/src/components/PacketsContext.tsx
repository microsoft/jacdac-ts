import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Packet from "../../../src/dom/packet";
import Frame from "../../../src/dom/frame";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { CHANGE, PROGRESS } from "../../../src/dom/constants";
import Trace from "../../../src/dom/trace";
import TracePlayer from "../../../src/dom/traceplayer";
import useDbValue from "./useDbValue"
import TraceRecorder from "../../../src/dom/tracerecorder"
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
    setReplayTrace: (trace: Trace) => void,
    recording: boolean,
    toggleRecording: () => void,
    tracing: boolean,
    toggleTracing: () => void,
    progress: number,
    timeRange: number[], // [start, end]
    toggleTimeRange: () => void,
    setTimeRange: (range: number[]) => void
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
    timeRange: undefined,
    toggleTimeRange: () => {},
    setTimeRange: (range) => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, connectionState, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const { value: filter, setValue: _setFilter } = useDbValue("packetfilter", "repeated-announce:false")

    const recorder = useRef<TraceRecorder>(new TraceRecorder(bus));
    const view = useRef<TraceView>(new TraceView(bus, filter));
    const player = useRef<TracePlayer>(new TracePlayer(bus));

    const [packets, setPackets] = useState<TracePacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [progress, setProgress] = useState(0)
    const [timeRange, setTimeRange] = useState<number[]>(undefined)
    const [recording, setRecording] = useState(false)
    const [trace, setTrace] = useState<Trace>(view.current.trace);
    const [replayTrace, _setReplayTrace] = useState<Trace>(undefined);
    const [tracing, setTracing] = useState(false);

    const clearPackets = () => {
        setSelectedPacket(undefined)
        setProgress(undefined)
        setTimeRange(undefined);
        player.current.stop();
        recorder.current.stop();
        view.current.clear();
        bus.clear();
    }
    const setReplayTrace = (trace: Trace) => {
        clearPackets();
        player.current.trace = trace
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
    const toggleTracing = async () => {
        console.log(`player toggle running ${player.current.running}`)
        if (player.current.running) {
            player.current.stop();
        } else {
            clearPackets();
            await disconnectAsync();
            player.current.start();
        }
    }
    const toggleTimeRange = () => {
        if (timeRange) {
            setTimeRange(undefined);
        } else {
            setTimeRange([view.current.trace.startTimestamp, view.current.trace.endTimestamp]);
        }
    }
    const setFilter = (f: string) => {
        _setFilter(f);
    }
    // update filter in the view
    useEffect(() => {
        let f = filter;
        if (timeRange?.[0] !== undefined)
            f += ` after:${timeRange[0]}`
        if (timeRange?.[1] !== undefined)
            f += ` before:${timeRange[1]}`
        view.current.filter = f
    }, [filter, timeRange]);
    // track state in React
    useEffect(() => view.current.subscribe(CHANGE, () => {
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
            timeRange, setTimeRange, toggleTimeRange
        }}>
            {children}
        </PacketsContext.Provider>
    )
}