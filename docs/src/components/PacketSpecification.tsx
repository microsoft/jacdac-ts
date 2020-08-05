import { isRegister } from "../../../src/dom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React, { Fragment } from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
// tslint:disable-next-line: no-submodule-imports
import CreateIcon from '@material-ui/icons/Create';
// tslint:disable-next-line: no-submodule-imports
import LockIcon from '@material-ui/icons/Lock';
// tslint:disable-next-line: no-submodule-imports
import CallToActionIcon from '@material-ui/icons/CallToAction';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FlashOnIcon from '@material-ui/icons/FlashOn';
import DeviceList from "./DeviceList";

import { makeStyles, createStyles } from "@material-ui/core";

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
    const kinds = {
        "ro": "read-only",
        "rw": "read-write"
        // command
        // event
        // const
    }
    const icons = {
        "ro": <LockIcon />,
        "rw": <CreateIcon />,
        "command": <CallToActionIcon />,
        "event": <FlashOnIcon />
    }

    if (!packetInfo)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${packetInfo.identifier}`}</Alert>

        console.log(packetInfo)
    return <div className={classes.root}>
        <h3 id={`register:${packetInfo.identifier}`}>{packetInfo.name}
            <Chip className={classes.chip} size="small" label={`id 0x${packetInfo.identifier.toString(16)}`} />
            {<Chip className={classes.chip} size="small" label={kinds[packetInfo.kind] || packetInfo.kind} icon={icons[packetInfo.kind]} />}
            {packetInfo.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packetInfo.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <p>{packetInfo.description}</p>
        {isRegister(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} registerAddress={packetInfo.identifier} />}
    </div>
}