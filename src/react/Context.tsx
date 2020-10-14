import React, { createContext } from "react";
import { JDBus, BusState } from "../dom/bus";
import TraceRecorder from "../dom/tracerecorder";

export interface JDContextProps {
    bus: JDBus,
    recorder?: TraceRecorder,
    connectionState: BusState,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}

const JACDACContext = createContext<JDContextProps>({
    bus: undefined,
    recorder: undefined,
    connectionState: BusState.Disconnected,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JACDACContext.displayName = "JACDAC";

export default JACDACContext;