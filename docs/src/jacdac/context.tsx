import React, { useContext } from "react";
import { Button } from "gatsby-theme-material-ui";
import { requestUSBBus } from "../../../src/hf2";
import { Bus } from "../../../src/bus";

const JacdacContext = React.createContext({
    bus: undefined,
    connectAsync: () => requestUSBBus()
});
JacdacContext.displayName = "jacdac";

export function ConnectButton() {
    return <JacdacContext.Consumer>
        {({ bus, connectAsync }) => <Button onClick={connectAsync}>{bus ? "disconnect" : "connect"}</Button>}
    </JacdacContext.Consumer>
}

export default JacdacContext;