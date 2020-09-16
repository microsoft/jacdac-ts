// tslint:disable-next-line: no-submodule-imports
import { createStyles, makeStyles } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import Alert from "@material-ui/lab/Alert";
import React, { useContext } from "react";
import { BusState } from "../../../src/dom/bus";
import JACDACContext from "../../../src/react/Context";
import ConnectButton from "../jacdac/ConnectButton";

const useStyles = makeStyles((theme) => createStyles({
    button: {
        marginLeft: theme.spacing(2)
    }
}))

export default function ConnectAlert() {
    const classes = useStyles()
    const { connectionState } = useContext(JACDACContext)
    if (connectionState === BusState.Disconnected)
        return <Alert severity="info" >
            <span>Don't forget to connect!</span>
            <ConnectButton className={classes.button} full={true} />
        </Alert>

    return <></>
}