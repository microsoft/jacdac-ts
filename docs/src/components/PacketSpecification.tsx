import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React, { Fragment } from "react";
import Chip from '@material-ui/core/Chip';
import LockIcon from '@material-ui/icons/Lock';
import CreateIcon from '@material-ui/icons/Create';
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
    const register = service?.packets.find(pkt => pkt.identifier == registerAddress)
    const kinds = {
        "ro": "read-only",
        "rw": "read-write"
    }
    const icons = {
        "ro": <LockIcon />,
        "rw": <CreateIcon />
    }
    
    if (!register)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${registerAddress}`}</Alert>
    
    return <div className={classes.root}>
        <h3 id={`register:${register.identifier}`}>{register.name}
            <Chip className={classes.chip} size="small" label={`id 0x${register.identifier.toString(16)}`} />
            {<Chip className={classes.chip} size="small" label={kinds[register.kind] || register.kind} icon={icons[register.kind]} />}
            {register.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {register.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <p>{register.description}</p>
    </div>
}