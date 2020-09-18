// tslint:disable-next-line: no-submodule-imports
import { createStyles, makeStyles } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import Alert from "@material-ui/lab/Alert";
import React, { useContext } from "react";
import { BusState } from "../../../src/dom/bus";
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import ConnectButton from "../jacdac/ConnectButton";

const useStyles = makeStyles((theme) => createStyles({
    button: {
        marginLeft: theme.spacing(2)
    }
}))

export default function ConnectAlert(props: { serviceClass?: number }) {
    const classes = useStyles()
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const { serviceClass } = props
    const spec = serviceSpecificationFromClassIdentifier(serviceClass)

    if (connectionState === BusState.Disconnected)
        return <Alert severity="info" >
            {!spec && <span>Don't forget to connect!</span>}
            {spec && <span>Don't forget to connect some {spec.name} devices!</span>}
            <ConnectButton className={classes.button} full={true} />
        </Alert>

    return <></>
}