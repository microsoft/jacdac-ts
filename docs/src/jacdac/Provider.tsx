import React, { useState, useEffect } from "react";
import JacdacContext from "../../../src/react/Context";
import { Bus } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";

const JacdacProvider = ({ children }) => {
    const [bus] = useState<Bus>(createUSBBus());
    const [connected, setConnected] = useState(bus.connected);
    const [connecting, setConnecting] = useState(bus.connecting);
    useEffect(() => {
        const update = () => {
            setConnecting(bus.connecting)
            setConnected(bus.connected)
        }
        bus.on(CONNECTION_STATE, update)
        return () => bus.off(CONNECTION_STATE, update)
    })
    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connected, connecting, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
