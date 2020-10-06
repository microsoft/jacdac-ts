import { createStyles, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField, Theme } from "@material-ui/core";
import React, { ChangeEvent, useState } from "react";
import { serviceSpecifications } from "../../../src/dom/spec"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            minWidth: "18rem",
        }
    }),
);

export default function ServiceSpecificationSelect(props: {
    serviceClass: number;
    setServiceClass: (serviceClass: number) => void
}) {
    const { serviceClass, setServiceClass } = props;
    const [labelId] = useState('select-' + Math.random());
    const classes = useStyles();
    const specs = serviceSpecifications().filter(spec => !/^_/.test(spec.shortId))

    const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
        setServiceClass(parseInt(event.target.value));

    return <TextField
        id={labelId}
        className={classes.root}
        label="Filter by Service"
        value={serviceClass}
        select
        onChange={handleChange}>
        <MenuItem key="none" value="NaN">No service selected</MenuItem>
        {specs.map(spec => <MenuItem
            key={spec.classIdentifier}
            value={spec.classIdentifier}>{spec.name}</MenuItem>)}
    </TextField>
}