import React, { useState, useEffect, useMemo } from "react";
import JacdacContext from "../../../src/react/Context";
import { Bus, BusState } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";

const JacdacProvider = ({ children }) => {
    const bus = useMemo<Bus>(createUSBBus, [createUSBBus]);
    const [firstConnect, setFirstConnect] = useState(false)
    const [connectionState, setConnectionState] = useState(bus.connectionState);
    useEffect(() => {
        // connect in background
        if (!firstConnect && bus.connectionState == BusState.Disconnected) {
            setFirstConnect(true)
            bus.connectAsync();
        }
        return () => { }
    }, [bus])
    useEffect(() => bus.subscribe<BusState>(CONNECTION_STATE,
        (connectionState) => setConnectionState(connectionState))
        , [bus])
    const connectAsync = () => bus.connectAsync(true);
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
