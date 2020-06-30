import { createContext } from "react";
import { Bus } from "../dom/bus";

export interface JacDacContextProps {
    bus: Bus,
    connected: boolean,
    connecting: boolean,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}

const JacdacContext = createContext<JacDacContextProps>({
    bus: undefined,
    connected: false,
    connecting: false,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JacdacContext.displayName = "jacdac";

export default JacdacContext;