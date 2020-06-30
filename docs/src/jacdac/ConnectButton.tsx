import React from "react";
import { Button } from "gatsby-theme-material-ui";
import JacdacContext from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
// tslint:disable-next-line: no-submodule-imports
import UsbIcon from '@material-ui/icons/Usb';
import { CircularProgress } from "@material-ui/core";

function ConnectButton() {
    return <JacdacContext.Consumer>
        {({ connectionState, connectAsync, disconnectAsync }) => <Button
            variant="contained"
            color="primary"
            startIcon={<UsbIcon />}
            disabled={connectionState != BusState.Connected && connectionState != BusState.Disconnected}
            onClick={connectionState == BusState.Connected ? disconnectAsync : connectAsync}>
            {(connectionState == BusState.Connected || connectionState == BusState.Disconnecting) ? "disconnect" : "connect"}
            {(connectionState == BusState.Connecting || connectionState == BusState.Disconnecting) && <CircularProgress />}
        </Button>}
    </JacdacContext.Consumer>
}

export default ConnectButton;