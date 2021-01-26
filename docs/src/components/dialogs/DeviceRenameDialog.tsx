import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Typography } from "@material-ui/core";
import React, { useState } from "react";
import { useId } from "react-use-id-hook";
import { JDDevice } from "../../../../src/jacdac";
import DeviceActions from "../DeviceActions";
import useDeviceHost from "../hooks/useDeviceHost";

export default function DeviceRenameDialog(props: { device: JDDevice, onClose: () => void }) {
    const { device, onClose } = props;
    const dialogId = useId()
    const open = !!device
    const [name, setName] = useState(device.name || "");
    const host = useDeviceHost(device)

    const handleCancel = (ev) => {
        ev.preventDefault()
        onClose();
    };
    const handleClose = (ev) => {
        ev.preventDefault()
        device.name = name;
        onClose();
    }
    const handleChange = (ev) => {
        setName(ev.target.value)
    }

    return <Dialog open={open} onClose={handleClose} aria-labelledby={dialogId}>
        <DialogTitle id={dialogId}>Name this {host ? "simulator" : "device"}</DialogTitle>
        <DialogContent>
            <DialogContentText>
                <span>Give a friendly name to </span>
                <strong>{device.shortId}</strong>
                <Typography variant="caption" component="span">({device.deviceId})</Typography>.
            <DeviceActions device={device} />
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                label="name"
                fullWidth
                value={name}
                onChange={handleChange}
            />
        </DialogContent>
        <DialogActions>
            <Button aria-label="cancel" onClick={handleCancel} variant="contained">Cancel</Button>
            <Button aria-label="save" onClick={handleClose} variant="contained" color="primary">Save</Button>
        </DialogActions>
    </Dialog>
}
