import React from "react"
import { isWebUSBSupported } from "../../../src/dom/usb"
import { NoSsr, makeStyles, createStyles } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import Alert from "@material-ui/lab/Alert";
import { Link } from "gatsby-theme-material-ui";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginBottom: theme.spacing(2)
    }
}))

function NoSsrAlert() {
    const classes = useStyles()
    const supported = isWebUSBSupported()
    return <>
        {!supported && <Alert className={classes.root} severity="info">Use a browser that supports <Link to="https://caniuse.com/#feat=webusb">WebUSB</Link> to connect to JACDAC devices.</Alert>}
    </>
}

export default function WebUSBAlert() {
    return <NoSsr>
        <NoSsrAlert />
    </NoSsr>
}