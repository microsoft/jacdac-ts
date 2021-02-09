import React, { useState, useEffect } from "react";
import JacdacContext from "../../../src/react/Context";
import { BusState, JDBus } from "../../../src/jdom/bus";
import { createUSBBus } from "../../../src/jdom/usb";
import { CONNECTION_STATE } from "../../../src/jdom/constants";
import IFrameBridgeClient from "../../../src/jdom/iframebridgeclient"
import Flags from "../../../src/jdom/flags"
import GamepadHostManager from "../../../src/hosts/gamepadhostmanager"

function sniffQueryArguments() {
    if (typeof window === "undefined" || typeof URLSearchParams === "undefined")
        return {
            diagnostic: false,
            webUSB: true,
        };

    const params = new URLSearchParams(window.location.search)
    return {
        diagnostics: params.get(`dbg`) === "1",
        webUSB: params.get(`webusb`) !== "0",
        parentOrigin: params.get('parentOrigin'),
        frameId: window.location.hash?.slice(1)
    }
}

const args = sniffQueryArguments();
Flags.diagnostics = args.diagnostics;
Flags.webUSB = args.webUSB;
const bus = Flags.webUSB ? createUSBBus(undefined, { parentOrigin: args.parentOrigin })
    : new JDBus(undefined);
bus.setBackgroundFirmwareScans(true);
GamepadHostManager.start(bus);

// tslint:disable-next-line: no-unused-expression
// always start bridge
if (typeof window !== "undefined")
    new IFrameBridgeClient(bus, args.frameId); // start bridge

const JacdacProvider = ({ children }) => {
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
        <JacdacContext.Provider value={{ bus, connectionState, connectAsync, disconnectAsync }}>
            {children}
        </JacdacContext.Provider>
    )
}

export default JacdacProvider;
