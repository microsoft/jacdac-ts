import React, { createContext } from "react";
import { JDBus, BusState } from "../jdom/bus";
export interface JDContextProps {
    bus: JDBus,
    connectionState: BusState,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}

const JacdacContext = createContext<JDContextProps>({
    bus: undefined,
    connectionState: BusState.Disconnected,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JacdacContext.displayName = "Jacdac";

export default JacdacContext;