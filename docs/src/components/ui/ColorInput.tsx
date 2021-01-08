import { Button, createStyles, Input, makeStyles, Paper } from "@material-ui/core";
import React, { ChangeEvent } from "react";
import { useId } from "react-use-id-hook"

const useStyles = makeStyles((theme) => createStyles({
    root: {
        width: theme.spacing(3),
    }
}));

export default function ColorInput(props: { value?: string; onChange: (newValue: string) => void }) {
    const { value, onChange } = props;
    const classes = useStyles();
    const colorId = useId();
    const handleColorChange = async (ev: ChangeEvent<HTMLInputElement>) => {
        const color = ev.target.value;
        onChange(color);
    }

    return <Button variant="outlined">
        <Input
            id={colorId}
            type="color"
            value={value}
            disableUnderline={true}
            fullWidth={true}
            onChange={handleColorChange} />
    </Button>
}