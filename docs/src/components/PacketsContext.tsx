import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Packet from "../../../src/jdom/packet";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { CHANGE, PROGRESS } from "../../../src/jdom/constants";
import Trace from "../../../src/jdom/trace";
import TracePlayer from "../../../src/jdom/traceplayer";
import useDbValue from "./useDbValue"
import TraceRecorder from "../../../src/jdom/tracerecorder"
import TraceView, { TracePacketProps } from "../../../src/jdom/traceview";

export interface PacketsProps {
    trace: Trace,
    packets: TracePacketProps[],
    selectedPacket: Packet,
    setSelectedPacket: (pkt: Packet) => void,
    clearPackets: () => void,
    clearBus: () => void,
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
    clearBus: () => { },
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
    toggleTimeRange: () => { },
    setTimeRange: (range) => { }
});
PacketsContext.displayName = "packets";

export default PacketsContext;

export const PacketsProvider = ({ children }) => {
    const { bus, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const { value: filter, setValue: _setFilter } = useDbValue("packetfilter", "repeated-announce:false")

    const recorder = useRef<TraceRecorder>(undefined);
    const view = useRef<TraceView>(undefined);
    const player = useRef<TracePlayer>(undefined);

    const [packets, setPackets] = useState<TracePacketProps[]>([])
    const [selectedPacket, setSelectedPacket] = useState<Packet>(undefined)
    const [progress, setProgress] = useState(0)
    const [timeRange, setTimeRange] = useState<number[]>(undefined)
    const [recording, setRecording] = useState(false)
    const [trace, setTrace] = useState<Trace>(undefined);
    const [replayTrace, _setReplayTrace] = useState<Trace>(undefined);
    const [tracing, setTracing] = useState(false);

    const clearPackets = () => {
        setSelectedPacket(undefined)
        setProgress(undefined)
        setTimeRange(undefined);
        player.current.stop();
        recorder.current.stop();
        view.current.clear();
        // don't clear the bus, it's too disrupting
        //bus.clear();
    }
    const clearBus = () => {
        clearPackets();
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
    // views
    useEffect(() => {
        recorder.current = new TraceRecorder(bus);
        view.current = new TraceView(bus, filter)
        player.current = new TracePlayer(bus);

        setTrace(view.current.trace);

        view.current.mount(view.current.subscribe(CHANGE, () => {
            setPackets(view.current.filteredPackets)
            setTrace(view.current.trace);
        }))
        recorder.current.mount(recorder.current.subscribe(CHANGE, () => {
            setRecording(recorder.current.recording);
        }))
        player.current.mount(player.current.subscribe(CHANGE, () => {
            setTracing(player.current.running);
            _setReplayTrace(player.current.trace);
        }))
        player.current.mount(player.current.subscribe(PROGRESS, () => {
            setProgress(player.current.progress);
        }))

        return () => {
            recorder.current.unmount();
            view.current.unmount();
            player.current.unmount();
        }
    }, [])
    // update filter in the view
    useEffect(() => {
        let f = filter;
        if (timeRange?.[0] !== undefined)
            f += ` after:${timeRange[0]}`
        if (timeRange?.[1] !== undefined)
            f += ` before:${timeRange[1]}`
        view.current.filter = f
    }, [filter, timeRange]);

    return (
        <PacketsContext.Provider value={{
            trace,
            packets, clearPackets, clearBus,
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