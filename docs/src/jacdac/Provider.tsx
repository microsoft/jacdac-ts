import React, { useState } from "react";
import JacdacContext from "./Context";
import { Bus } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { DISCONNECT, CONNECTING, CONNECT } from "../../../src/dom/constants";

const JacdacProvider = ({ children }) => {
    const [bus] = useState<Bus>(createUSBBus());
    const [connected, setConnected] = useState(bus.connected);
    const [connecting, setConnecting] = useState(bus.connecting);
    bus.on(CONNECT, () => setConnected(bus.connected))
    bus.on(CONNECTING, () => setConnecting(bus.connecting))
    bus.on(DISCONNECT, () => setConnected(bus.connected))

    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connected, connecting, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
