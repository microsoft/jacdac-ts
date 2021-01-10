import { Button, createStyles, Dialog, DialogContent, DialogTitle, IconButton, makeStyles } from '@material-ui/core';
import React, { useState } from 'react'
import { CirclePicker } from "react-color"
import { useId } from 'react-use-id-hook';
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';

export default function ColorPicker(props: { value: string, onChange: (color: string) => void }) {
    const { value, onChange } = props;
    const [picker, setPicker] = useState(false);
    const handleClick = () => setPicker(!picker);
    const handleClose = () => setPicker(false);
    const handleChange = color => {
        setPicker(false);
        onChange(color.hex);
    }
    const colorStyle = { background: value }

    return (
        <>
            <IconButton style={colorStyle} onClick={handleClick}>
                <FiberManualRecordIcon />
            </IconButton>
            <Dialog open={picker} onClose={handleClose}>
                <DialogContent>
                    <CirclePicker color={value} onChange={handleChange} />
                </DialogContent>
            </Dialog>
        </>
    )
}
