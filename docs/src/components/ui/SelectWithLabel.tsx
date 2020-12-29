import { FormControl, FormHelperText, InputLabel, Select } from "@material-ui/core"
import React, { ChangeEvent } from "react"

export function SelectWithLabel(props: {
    required?: boolean,
    label?: string,
    disabled?: boolean,
    error?: string,
    value?: string,
    placeholder?: string,
    type?: string,
    onChange?: (ev: ChangeEvent<{ name?: string; value: unknown; }>) => void, helperText?: string,
    children?: JSX.Element | JSX.Element[]
}) {
    const { label, required, disabled, value, error,
        placeholder, onChange, children, helperText, type } = props;

    return <FormControl fullWidth={true} variant="outlined">
        <InputLabel key="label">{required ? `${label} *` : label}</InputLabel>
        <Select
            disabled={disabled}
            label={label}
            value={value}
            error={!!error}
            fullWidth={true}
            placeholder={placeholder}
            type={type}
            onChange={onChange}>
            {children}
        </Select>
        {(helperText || error) && <FormHelperText>{error || helperText}</FormHelperText>}
    </FormControl >;
}