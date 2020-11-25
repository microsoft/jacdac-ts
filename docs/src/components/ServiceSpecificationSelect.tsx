import { createStyles, FormControl, InputLabel, makeStyles, MenuItem, Select, TextField, Theme } from "@material-ui/core";
import React, { ChangeEvent, useState } from "react";
import { serviceSpecifications } from "../../../src/jdom/spec"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            minWidth: "18rem",
        }
    }),
);

export default function ServiceSpecificationSelect(props: {
    label: string,
    serviceClass: number;
    setServiceClass: (serviceClass: number) => void;
    variant?: "outlined" | "filled" | "standard";
    fullWidth?: boolean;
}) {
    const { label, serviceClass, setServiceClass, variant, fullWidth } = props;
    const [labelId] = useState('select-' + Math.random());
    const classes = useStyles();
    const specs = serviceSpecifications().filter(spec => !/^_/.test(spec.shortId))

    const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
        setServiceClass(parseInt(event.target.value));

    return <TextField
        id={labelId}
        className={classes.root}
        label={label}
        value={serviceClass}
        select
        variant={variant}
        fullWidth={fullWidth}
        onChange={handleChange}>
        <MenuItem key="none" value="NaN">No service selected</MenuItem>
        {specs.map(spec => <MenuItem
            key={spec.classIdentifier}
            value={spec.classIdentifier}>{spec.name}</MenuItem>)}
    </TextField>
}