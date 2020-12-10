import React, { useState } from "react"
import { isWebUSBEnabled, isWebUSBSupported } from "../../../src/jdom/usb"
import { Collapse, NoSsr } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import { Link } from "gatsby-theme-material-ui";
import Flags from "../../../src/jdom/flags";

function NoSsrAlert() {
    const enabled = isWebUSBEnabled();
    const supported = isWebUSBSupported()
    return <>
        {enabled && !supported &&
            <Alert closeable={true} severity="info">
                Use a browser that supports <Link to="https://caniuse.com/#feat=webusb">WebUSB</Link> to connect to JACDAC devices.
            </Alert>}
    </>
}

export default function WebUSBAlert() {
    return <NoSsr>
        <NoSsrAlert />
    </NoSsr>
}