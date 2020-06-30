import { createContext } from "react";
import { Bus } from "../dom/bus";

const JacdacContext = createContext<{
    bus: Bus,
    connected: boolean,
    connecting: boolean,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}>({
    bus: undefined,
    connected: false,
    connecting: false,
    connectAsync: undefined,
    disconnectAsync: undefined
});
JacdacContext.displayName = "jacdac";

export default JacdacContext;