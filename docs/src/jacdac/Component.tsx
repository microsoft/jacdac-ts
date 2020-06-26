import React from "react";
import JacdacContext from "./Context";
import ConnectButton from "./ConnectButton"

const JacdacComponent = ({ children }) => {
    return <JacdacContext.Consumer>
        {({ bus }) => bus ? children : <ConnectButton />}
    </JacdacContext.Consumer>
}

export default JacdacComponent;