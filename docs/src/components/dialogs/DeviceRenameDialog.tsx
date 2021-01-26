import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@material-ui/core";
import React, { useState } from "react";
import { useId } from "react-use-id-hook";
import { JDDevice } from "../../../../src/jacdac";
import DeviceActions from "../DeviceActions";

export default function DeviceRenameDialog(props: { device: JDDevice, onClose: () => void }) {
    const { device, onClose } = props;
    const dialogId = useId()
    const open = !!device
    const [name, setName] = useState(device.name || "");

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
        <DialogTitle id={dialogId}>Name your device</DialogTitle>
        <DialogContent>
            <DialogContentText>
                <span>Give a friendly name to </span>
                <strong>{device.shortId}</strong> ({device.deviceId}).
            <DeviceActions device={device} />
            </DialogContentText>
            <TextField
                autoFocus
                margin="dense"
                label="Device name"
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
