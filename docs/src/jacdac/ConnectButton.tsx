import React from "react";
import { Button } from "gatsby-theme-material-ui";
import JacdacContext from "./Context";

function ConnectButton() {
    return <JacdacContext.Consumer>
        {({ bus, connectAsync, disconnectAsync }) => <Button onClick={bus ? connectAsync : disconnectAsync}>{!!bus ? "disconnect" : "connect"}</Button>}
    </JacdacContext.Consumer>
}

export default ConnectButton;