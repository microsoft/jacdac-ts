import { FormControl, FormHelperText, InputLabel, Select } from "@material-ui/core"
import React, { ChangeEvent } from "react"
import { useId } from "react-use-id-hook";

export default function SelectWithLabel(props: {
    required?: boolean,
    label?: string,
    disabled?: boolean,
    error?: string,
    value?: string,
    placeholder?: string,
    type?: string,
    fullWidth?: boolean,
    onChange?: (ev: ChangeEvent<{ name?: string; value: unknown; }>) => void,
    helperText?: string,
    children?: JSX.Element | JSX.Element[]
}) {
    const { label, fullWidth, required, disabled, value, error,
        placeholder, onChange, children, helperText, type } = props;
    const labelId = useId();
    const descrId = useId();
    const hasDescr = (!!helperText || !!error);

    return <FormControl fullWidth={fullWidth} variant="outlined">
        <InputLabel id={labelId} key="label">{required ? `${label} *` : label}</InputLabel>
        <Select
            disabled={disabled}
            label={label}
            value={value}
            error={!!error}
            fullWidth={true}
            placeholder={placeholder}
            type={type}
            aria-labelledby={labelId}
            aria-describedby={hasDescr && descrId}
            onChange={onChange}>
            {children}
        </Select>
        {hasDescr && <FormHelperText id={descrId}>{error || helperText}</FormHelperText>}
    </FormControl >;
}