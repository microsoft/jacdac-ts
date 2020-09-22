import React, { useState } from "react";
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Switch, TextField, Typography } from "@material-ui/core";
import { JDService } from "../../../src/dom/service";
import { Button } from "gatsby-theme-material-ui";
import DeviceName from "./DeviceName";
import IDChip from "./IDChip";
import { flagsToValue, valueToFlags } from "../../../src/dom/pretty";

function CommandFieldInput(props: { service: JDService, field: jdspec.PacketMember, value: any, setValue: (v: any) => void }) {
    const { service, field, value, setValue } = props;
    const { specification } = service;
    const enumInfo = specification?.enums[field.type]
    const label = `${field.name}: ${field.type}`
    const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
        console.log(`command field set value`, ev.target.value)
        setValue(ev.target.value)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setValue(v)
    }
    if (field.type === 'bool')
        return <>
            <Switch checked={!!value} onChange={handleChange} />
            {label}
        </>
    else if (enumInfo !== undefined) {
        return <Select
            multiple={enumInfo.isFlags}
            value={enumInfo.isFlags ? valueToFlags(enumInfo, value) : value}
            onChange={handleEnumChange}>
            {Object.keys(enumInfo.members).map(n => <MenuItem key={n} value={enumInfo.members[n]}>{n} <IDChip id={enumInfo.members[n]} /></MenuItem>)}
        </Select>
    }
    else
        return <TextField
            label={label}
            value={value || ""}
            onChange={handleChange}
            required={value === undefined}
        />
}

export default function CommandInput(props: { service: JDService, command: jdspec.PacketInfo, showDeviceName?: boolean }) {
    const { service, command, showDeviceName } = props;
    const [working, setWorking] = useState(false)
    const [open, setOpen] = React.useState(false);
    const [args, setArgs] = useState<any[]>(command.fields.map(f => undefined));

    console.log(`command field args`, args)

    const handleCancel = (ev) => {
        ev.stopPropagation()
        setOpen(false);
    };
    const handleClose = (ev) => {
        ev.stopPropagation()
        setOpen(false);
    };
    const handleRun = (ev) => {
        ev.stopPropagation()
        setOpen(false);
    }
    const handleClick = async () => {
        if (!command.fields?.length) {
            try {
                setWorking(true)
                await service.sendCmdAsync(command.identifier, true)
            } finally {
                setWorking(false)
            }
        } else {
            setOpen(true)
        }
    }
    const handleSetArg = (index: number) => (value: any) => {
        const a = args.slice(0)
        a[index] = value;
        setArgs(a)
    }

    const runDisabled = working || args.some(arg => arg === undefined)
    return <>
        <Button key="button" variant="contained"
            disabled={working}
            onClick={handleClick}>
            {showDeviceName && <Typography>
                <DeviceName device={service.device} />/
        </Typography>}
            {command.name}
            {working && <CircularProgress size="small" />}
        </Button>
        <Dialog key="dialog" open={open} onClose={handleClose} aria-labelledby="command-input-title">
            <DialogTitle>
                run command
            </DialogTitle>
            <DialogContent>
                <div>
                    <code>{command.name}</code>
                    on <DeviceName device={service.device} serviceNumber={service.service_number} />
                </div>
                {command.fields.map((field, i) => <div key={"cmd" + command.identifier}>
                    <CommandFieldInput service={service} field={field} value={args[i]} setValue={handleSetArg(i)} />
                </div>)}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} variant="contained">Cancel</Button>
                <Button disabled={runDisabled} onClick={handleRun} variant="contained" color="primary">Run</Button>
            </DialogActions>
        </Dialog>
    </>
}