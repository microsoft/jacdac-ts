import React, { useState, useEffect, useMemo } from "react";
import JacdacContext from "../../../src/react/Context";
import { Bus, BusState } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";

const JacdacProvider = ({ children }) => {
    const bus = useMemo<Bus>(createUSBBus, [createUSBBus]);
    const [firstConnect, setFirstConnect] = useState(false)
    const [connectionState, setConnectionState] = useState(bus.connectionState);

    // connect in background on first load
    useEffect(() => {
        if (!firstConnect && bus.connectionState == BusState.Disconnected) {
            setFirstConnect(true)
            bus.connectAsync(true);
        }
        return () => { }
    }, [bus])

    // subscribe to connection state changes
    useEffect(() => bus.subscribe<BusState>(CONNECTION_STATE, connectionState => setConnectionState(connectionState)),[bus])

    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JacdacContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
