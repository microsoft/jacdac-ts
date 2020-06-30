import React from "react";
import { Button } from "gatsby-theme-material-ui";
import JacdacContext from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";

function ConnectButton() {
    return <JacdacContext.Consumer>
        {({ connectionState, connectAsync, disconnectAsync }) => <Button color="inherit"
            disabled={connectionState != BusState.Connected && connectionState != BusState.Disconnected}
            onClick={connectionState == BusState.Connected ? disconnectAsync : connectAsync}>
            {connectionState == BusState.Connected ? "disconnect jacdac" : connectionState == BusState.Disconnected ? "connect jacdac" : "..."}
        </Button>}
    </JacdacContext.Consumer>
}

export default ConnectButton;