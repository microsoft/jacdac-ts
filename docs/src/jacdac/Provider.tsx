import React, { useState, useEffect } from "react";
import JACDACContext from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
import { createUSBBus } from "../../../src/dom/usb";
import { CONNECTION_STATE } from "../../../src/dom/constants";
import IFrameBridgeClient from "../../../src/dom/iframebridgeclient"
import { inIFrame } from "../../../src/dom/iframeclient";
import Flags from "../../../src/dom/flags"

function sniffQueryArguments() {
    if (typeof window === "undefined" || typeof URLSearchParams === "undefined")
        return {};

    const params = new URLSearchParams(window.location.search)
    return {
        parentOrigin: params.get('parentOrigin')
    }
}

const args = sniffQueryArguments();
const bus = createUSBBus(undefined, {
    parentOrigin: args.parentOrigin
});
bus.setBackgroundFirmwareScans(true);
// tslint:disable-next-line: no-unused-expression
if (inIFrame()) {
    new IFrameBridgeClient(bus); // start bridge
}
Flags.diagnostics = typeof window !== "undefined" && /dbg=1/.test(window.location.href);


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
    }, [])

    // subscribe to connection state changes
    useEffect(() => bus.subscribe<BusState>(CONNECTION_STATE, connectionState => setConnectionState(connectionState)), [])

    const connectAsync = () => bus.connectAsync();
    const disconnectAsync = () => bus.disconnectAsync();
    return (
        <JACDACContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JACDACContext.Provider>
    )
}

export default JACDACProvider;
