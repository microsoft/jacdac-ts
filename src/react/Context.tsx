import { createContext } from "react";
import { Bus, BusState } from "../dom/bus";

export interface JacDacContextProps {
    bus: Bus,
    connectionState: BusState,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}

const JacdacContext = createContext<JacDacContextProps>({
    bus: undefined,
    connectionState: BusState.Disconnected,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JacdacContext.displayName = "jacdac";

export default JacdacContext;