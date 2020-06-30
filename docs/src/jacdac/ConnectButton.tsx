import React, { useEffect, useState, useContext } from "react";
import { Button } from "gatsby-theme-material-ui";
import JacdacContext from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
// tslint:disable-next-line: no-submodule-imports
import UsbIcon from '@material-ui/icons/Usb';
import { CircularProgress } from "@material-ui/core";
import { DEVICE_CHANGE } from "../../../src/dom/constants";

function ConnectButton() {
    const { bus } = useContext(JacdacContext)
    const [count, setCount] = useState(0)
    useEffect(() => {
        const update = () => setCount(bus.devices().length)
        bus.on(DEVICE_CHANGE, update)
        return () => bus.off(DEVICE_CHANGE, update)
    })
    return <JacdacContext.Consumer>
        {({ connectionState, connectAsync, disconnectAsync }) => <Button
            variant="contained"
            color="primary"
            startIcon={<UsbIcon />}
            disabled={connectionState != BusState.Connected && connectionState != BusState.Disconnected}
            onClick={connectionState == BusState.Connected ? disconnectAsync : connectAsync}>
            {(connectionState == BusState.Connected || connectionState == BusState.Disconnecting) ? "disconnect" : "connect"}
            {count > 0 && ` (${count})`}
            {(connectionState == BusState.Connecting || connectionState == BusState.Disconnecting) && <CircularProgress />}
        </Button>}
    </JacdacContext.Consumer>
}

export default ConnectButton;