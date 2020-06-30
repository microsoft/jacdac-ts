import React, { useState, useEffect, useMemo } from "react";
import JacdacContext from "../../../src/react/Context";
import { Bus } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";

const JacdacProvider = ({ children }) => {
    const bus = useMemo<Bus>(createUSBBus, [createUSBBus]);
    const [connectionState, setConnectionState] = useState(bus.connectionState);
    useEffect(() => {
        const update = () => setConnectionState(bus.connectionState)
        bus.on(CONNECTION_STATE, update)
        return () => bus.off(CONNECTION_STATE, update)
    })
    const connectAsync = () => bus.connectAsync(true);
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
