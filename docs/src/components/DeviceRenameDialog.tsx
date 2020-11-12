import React, { useContext, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import Button from '@material-ui/core/Button';
// tslint:disable-next-line: no-submodule-imports
import TextField from '@material-ui/core/TextField';
// tslint:disable-next-line: no-submodule-imports
import Dialog from '@material-ui/core/Dialog';
// tslint:disable-next-line: no-submodule-imports
import DialogActions from '@material-ui/core/DialogActions';
// tslint:disable-next-line: no-submodule-imports
import DialogContent from '@material-ui/core/DialogContent';
// tslint:disable-next-line: no-submodule-imports
import DialogContentText from '@material-ui/core/DialogContentText';
// tslint:disable-next-line: no-submodule-imports
import DialogTitle from '@material-ui/core/DialogTitle';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EditIcon from '@material-ui/icons/Edit';
import { JDDevice } from '../../../src/jdom/device';
import DeviceActions from './DeviceActions';
import { IconButton } from 'gatsby-theme-material-ui';

export default function DeviceRenameButton(props: { device: JDDevice }) {
    const { device } = props
    const [open, setOpen] = React.useState(false);
    const [name, setName] = useState(device.name);

    const handleClickOpen = (ev) => {
        ev.stopPropagation()
        setOpen(true);
    };
    const handleCancel = (ev) => {
        ev.stopPropagation()
        setOpen(false);
    };
    const handleClose = (ev) => {
        ev.stopPropagation()
        device.name = name;
        setOpen(false);
    }
    const handleChange = (ev) => {
        setName(ev.target.value)
    }

    return <>
        <IconButton size="small" aria-label="rename device" title="rename device" onClick={handleClickOpen}>
            <EditIcon />
        </IconButton>
        <Dialog open={open} onClose={handleClose} aria-labelledby="device-rename-dialog">
            <DialogTitle id="device-rename-dialog">Name your device</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    <span>Give a friendly name to </span>
                    <strong>{device.shortId}</strong> ({device.deviceId}).
                    <DeviceActions device={device} />
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
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
    </>
}