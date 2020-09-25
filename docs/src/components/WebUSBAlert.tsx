import React from "react"
import { isWebUSBSupported } from "../../../src/dom/usb"
import { NoSsr } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import { Link } from "gatsby-theme-material-ui";

function NoSsrAlert() {
    const supported = isWebUSBSupported()
    return <>
        {!supported && <Alert severity="info">Use a browser that supports <Link to="https://caniuse.com/#feat=webusb">WebUSB</Link> to connect to JACDAC devices.</Alert>}
    </>
}

export default function WebUSBAlert() {
    return <NoSsr>
        <NoSsrAlert />
    </NoSsr>
}