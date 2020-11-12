import React, { createContext } from "react";
import { JDBus, BusState } from "../jdom/bus";
import TraceRecorder from "../jdom/tracerecorder";

export interface JDContextProps {
    bus: JDBus,
    connectionState: BusState,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}

const JACDACContext = createContext<JDContextProps>({
    bus: undefined,
    connectionState: BusState.Disconnected,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JACDACContext.displayName = "JACDAC";

export default JACDACContext;