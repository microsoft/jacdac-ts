import React from "react";
import { Bus } from "../../../src/bus";

const JacdacContext = React.createContext<{
    bus: Bus,
    connectAsync: () => Promise<void>,
    disconnectAsync: () => Promise<void>
}>({ bus: undefined, connectAsync: undefined, disconnectAsync: undefined });
JacdacContext.displayName = "jacdac";

export default JacdacContext;