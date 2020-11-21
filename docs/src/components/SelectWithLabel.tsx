import { FormControl, FormHelperText, InputLabel, Select } from "@material-ui/core"
import React, { ChangeEvent } from "react"

export function SelectWithLabel(props: {
    label?: string, 
    disabled?: boolean,
    error?: string,
    value?: string,
    onChange?: (ev: ChangeEvent<{ name?: string; value: unknown; }>) => void, helperText?: string,
    children?: JSX.Element | JSX.Element[]
}) {
    const { label, disabled, value, error, onChange, children, helperText } = props;

    return <FormControl fullWidth={true} variant="outlined">
        <InputLabel key="label">{label}</InputLabel>
        <Select
            disabled={disabled}
            label={label}
            value={value}
            error={!!error}
            fullWidth={true}
            onChange={onChange}>
            {children}
        </Select>
        {(helperText || error) && <FormHelperText>{error || helperText}</FormHelperText>}
    </FormControl >;
}