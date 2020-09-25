import React, { useEffect, useState, useContext } from "react";
import { Button } from "gatsby-theme-material-ui";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import UsbIcon from '@material-ui/icons/Usb';
import { CircularProgress, Hidden } from "@material-ui/core";
import { DEVICE_CHANGE } from "../../../src/dom/constants";
import KindIcon from "../components/KindIcon";

export default function ConnectButton(props: { full?: boolean, className?: string }) {
    const { full, className } = props
    const { bus, connectionState, connectAsync, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const [count, setCount] = useState(bus.devices().length)
    useEffect(() => bus.subscribe(DEVICE_CHANGE, () => setCount(bus.devices().length)))
    const showDisconnect = connectionState == BusState.Connected || connectionState == BusState.Disconnecting;
    const inProgress = connectionState == BusState.Connecting || connectionState == BusState.Disconnecting
    return <Button
        size="small"
        variant="contained"
        color="primary"
        className={className}
        startIcon={showDisconnect ? <KindIcon kind="device" /> : <UsbIcon />}
        disabled={connectionState != BusState.Connected && connectionState != BusState.Disconnected}
        onClick={showDisconnect ? disconnectAsync : connectAsync}>
        {!full && <Hidden mdDown>{showDisconnect ? "disconnect" : "connect"}</Hidden>}
        {full && (showDisconnect ? "disconnect" : "connect")}
        {count > 0 && ` (${count})`}
        {inProgress && <CircularProgress />}
    </Button>
}
