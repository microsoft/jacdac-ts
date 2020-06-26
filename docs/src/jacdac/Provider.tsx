import React, { useState, useEffect } from "react";
import { Bus } from "../../../src/bus";
import { createUSBBus } from "../../../src/webusb";
import JacdacContext from "./Context";

const JacdacProvider = ({ children }) => {
    const [bus, setBus] = useState<Bus>(createUSBBus());
    const [connected, setConnected] = useState(bus.connected);
    const [connecting, setConnecting] = useState(bus.connecting);
    bus.on("connect", () => setConnected(bus.connected))
    bus.on("connecting", () => setConnected(bus.connecting))
    bus.on("disconnect", () => setConnected(bus.connected))

    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connected, connecting, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}
export default JacdacProvider;