import React, { useState, useEffect, useContext } from "react";
import { Bus } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/webusb";
import JacdacContext from "../../../src/react/Context";

const JacdacProvider = ({ children }) => {
    const [bus] = useState<Bus>(createUSBBus());
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
