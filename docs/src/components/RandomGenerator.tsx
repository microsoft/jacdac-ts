
import React, { useState } from "react"
import { cryptoRandomUint32 } from "../../../src/dom/utils";
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec";
import { TextField, Button, Paper, Card, makeStyles, CardContent, CardActions, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CheckIcon from '@material-ui/icons/Check';

function uniqueServiceId() {
    let id = cryptoRandomUint32()
    while (serviceSpecificationFromClassIdentifier(id)) {
        id = cryptoRandomUint32()
    }
    return "0x" + ("000000000" + id.toString(16)).slice(-8)
}

const useStyles = makeStyles({
    root: {
        minWidth: 275,
        marginBottom: "1rem"
    },
    title: {
        fontSize: 14,
    }
})

export default function RandomGenerator() {
    const classes = useStyles()
    const [value, setValue] = useState(uniqueServiceId())
    const [copySuccess, setCopySuccess] = useState(false);

    const handleRegenerate = () => {
        setValue(uniqueServiceId())
        setCopySuccess(false)
    }
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopySuccess(true);
        } catch (err) {
            setCopySuccess(false);
        }
    };

    return <Card className={classes.root}>
        <CardContent>
            <Typography className={classes.title} color="textSecondary" gutterBottom>
                Random Service Identifier
            </Typography>
            <Typography variant="h5" component="h2">
                <TextField value={value} InputProps={{
                    readOnly: true,
                }} />
                {copySuccess && <CheckIcon />}
            </Typography>
        </CardContent>
        <CardActions>
            <Button size="small" onClick={handleCopy}>Copy</Button>
            <Button size="small" onClick={handleRegenerate}>Regenerate</Button>
        </CardActions>
    </Card>
}