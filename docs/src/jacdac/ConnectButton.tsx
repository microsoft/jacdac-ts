import React from "react";
import { Button } from "gatsby-theme-material-ui";
import JacdacContext from "./Context";

function ConnectButton() {
    return <JacdacContext.Consumer>
        {({ connected, connecting, connectAsync, disconnectAsync }) => <Button disabled={connecting}
            onClick={connected ? disconnectAsync : connectAsync}>
                {connected ? "disconnect jacdac" : "connect jacdac"}
            </Button>}
    </JacdacContext.Consumer>
}

export default ConnectButton;