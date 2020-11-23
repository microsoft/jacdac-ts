
import React, { useState } from "react"
import { cryptoRandomUint32 } from "../../../src/jdom/utils";
import { deviceSpecificationFromFirmwareIdentifier, serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import { TextField, Paper, Card, makeStyles, CardContent, CardActions, Typography, createStyles } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CheckIcon from '@material-ui/icons/Check';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import { Button } from "gatsby-theme-material-ui";
import { NoSsr } from '@material-ui/core';

function looksRandom(n: number) {
    const s = n.toString(16)
    const h = "0123456789abcdef"
    for (let i = 0; i < h.length; ++i) {
        const hh = h[i]
        if (s.indexOf(hh + hh + hh) >= 0)
            return false
    }
    if (/f00d|dead|deaf|beef/.test(s))
        return false
    return true
}

function genServId() {
    const n = cryptoRandomUint32(1);
    if (n === undefined)
        return undefined;
    return (n[0] & 0xfff_ffff) | 0x1000_0000
}

function genFirmwareId() {
    const n = cryptoRandomUint32(1);
    if (n === undefined)
        return undefined;
    return (n[0] & 0xfff_ffff) | 0x3000_0000
}

function toFullHex(n: number[]) {
    return "0x" + n.map(id => ("000000000" + id.toString(16)).slice(-8)).join('')
}

export function uniqueServiceId() {
    let id = genServId()
    while (id !== undefined && (!looksRandom(id) || serviceSpecificationFromClassIdentifier(id))) {
        id = genServId()
    }
    return id !== undefined && toFullHex([id])
}

export function uniqueDeviceId() {
    const n = cryptoRandomUint32(2);
    return n !== undefined && toFullHex([n[0], n[1]])
}

export function uniqueFirmwareId() {
    let id = genFirmwareId()
    while (id !== undefined && (!looksRandom(id) || deviceSpecificationFromFirmwareIdentifier(id))) {
        id = genFirmwareId()
    }
    return id !== undefined && toFullHex([id])
}

const useStyles = makeStyles(createStyles({
    root: {
        minWidth: 275,
        marginBottom: "1rem"
    },
    title: {
        fontSize: 14,
    }
}))

export default function RandomGenerator(props: { device?: boolean, firmware?: boolean }) {
    const { device, firmware } = props
    const classes = useStyles()
    const [value, setValue] = useState(device ? uniqueDeviceId() : uniqueServiceId())
    const [copySuccess, setCopySuccess] = useState(false);

    const handleRegenerate = () => {
        const v = device ? uniqueDeviceId() : firmware ? uniqueFirmwareId() : uniqueServiceId()
        setValue(v)
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

    return <NoSsr>
        <Card className={classes.root}>
            <CardContent>
                <Typography className={classes.title} color="textSecondary" gutterBottom>
                    {device ? "Random Device Identifier" : firmware ? "Random Firmware Identifier" : "Random Service Identifier"}
                </Typography>
                {value !== undefined &&
                    <Typography variant="h5" component="h2">
                        <TextField value={value} InputProps={{
                            readOnly: true,
                        }} />
                        {copySuccess && <CheckIcon />}
                    </Typography>}
                {value === undefined &&
                    <Alert severity="error">Oops, unable to generate a strong random number.</Alert>}
            </CardContent>
            <CardActions>
                <Button aria-label="copy random number to clipboard" size="small" variant="contained" onClick={handleCopy}>Copy</Button>
                <Button aria-label="regenerate random number" size="small" variant="contained" color="primary" onClick={handleRegenerate}>Regenerate</Button>
            </CardActions>
        </Card>
    </NoSsr>
}