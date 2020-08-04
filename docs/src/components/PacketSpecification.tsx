import { serviceSpecificationFromClassIdentifier, isRegister } from "../../../src/dom/spec"
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
// tslint:disable-next-line: no-submodule-imports
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

export default function PacketSpecification(props: { serviceClass: number, registerAddress: number }) {
    const { serviceClass, registerAddress } = props;
    const classes = useStyles();
    const service = serviceSpecificationFromClassIdentifier(serviceClass)
    const packet = service?.packets.find(pkt => pkt.identifier == registerAddress)
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

    if (!packet)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${registerAddress}`}</Alert>

    return <div className={classes.root}>
        <h3 id={`register:${packet.identifier}`}>{packet.name}
            <Chip className={classes.chip} size="small" label={`id 0x${packet.identifier.toString(16)}`} />
            {<Chip className={classes.chip} size="small" label={kinds[packet.kind] || packet.kind} icon={icons[packet.kind]} />}
            {packet.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packet.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <p>{packet.description}</p>
        {isRegister(packet) && <DeviceList serviceClass={serviceClass} registerAddress={registerAddress} />}
    </div>
}