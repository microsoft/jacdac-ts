import React, { useState } from "react";
import { Bus } from "../../../src/bus";
import { requestUSBBus } from "../../../src/hf2";
import JacdacContext from "./Context";
import { Helmet } from "react-helmet";

const JacdacProvider = ({ children }) => {
    const [bus, setBus] = useState<Bus>(undefined);
    const connectAsync = () => !bus ? requestUSBBus().then(b => setBus(b)) : Promise.resolve();
    const disconnectAsync = () => bus ? bus.disconnectAsync() : Promise.resolve();
    return (
        <JacdacContext.Provider value={{ bus, connectAsync, disconnectAsync }}>
            <React.Fragment>
                <Helmet>
                    <script src="https://cdn.jsdelivr.net/npm/jacdac-ts" />
                </Helmet>
                {children}
            </React.Fragment>
        </JacdacContext.Provider>
    )
}
export default JacdacProvider;