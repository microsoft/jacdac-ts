import React, { useState, useEffect, useMemo } from "react";
import JACDACContext from "../../../src/react/Context";
import { JDBus, BusState } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";
import IFrameBridgeClient from "../../../src/dom/iframebridgeclient"

const bus = createUSBBus();
bus.setBackgroundFirmwareScans(true)
const iframeBridge = new IFrameBridgeClient(bus, "*");

const JACDACProvider = ({ children }) => {
    const [firstConnect, setFirstConnect] = useState(false)
    const [connectionState, setConnectionState] = useState(bus.connectionState);

    // connect in background on first load
    useEffect(() => {
        if (!firstConnect && bus.connectionState == BusState.Disconnected) {
            setFirstConnect(true)
            bus.connectAsync(true);
        }
        return () => { }
    })

    // subscribe to connection state changes
    useEffect(() => bus.subscribe<BusState>(CONNECTION_STATE, connectionState => setConnectionState(connectionState)), [bus])

    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JACDACContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JACDACContext.Provider>
    )
}

export default JACDACProvider;
