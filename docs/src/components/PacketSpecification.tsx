import { isRegister } from "../../../src/dom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React, { Fragment } from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
import DeviceList from "./DeviceList";
import { makeStyles, createStyles } from "@material-ui/core";
import IDChip from "./IDChip";
import KindChip from "./KindChip";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    chip: {
        margin: theme.spacing(0.5),
    },
}),
);

export default function PacketSpecification(props: { serviceClass: number, packetInfo: jdspec.PacketInfo }) {
    const { serviceClass, packetInfo } = props;
    const classes = useStyles();
    if (!packetInfo)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${packetInfo.identifier}`}</Alert>

    return <div className={classes.root}>
        <h3 id={`${packetInfo.kind}:${packetInfo.identifier}`}>{packetInfo.name}
            <IDChip className={classes.chip} id={packetInfo.identifier} />
            <KindChip className={classes.chip} kind={packetInfo.kind} />
            {packetInfo.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packetInfo.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <p>{packetInfo.description}</p>
        {isRegister(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} registerIdentifier={packetInfo.identifier} />}
    </div>
}