import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import React, { useState } from "react";
import { flagsToValue, prettyUnit, valueToFlags } from "../../../src/dom/pretty";
import { tryParseMemberValue } from "../../../src/dom/spec";
import IDChip from "./IDChip";

function isSet(field: any) {
    return field !== null && field !== undefined
}

export default function FieldInput(props: { service: jdspec.ServiceSpec, field: jdspec.PacketMember, setArg: (v: any) => void }) {
    const { service, field, setArg } = props;
    const enumInfo = service.enums?.[field.type]
    const [value, setValue] = useState<any>("")
    const [error, setError] = useState(false)
    const name = field.name !== "_" ? field.name : ""
    const parts: string[] = [
        prettyUnit(field.unit),
        isSet(field.typicalMin) && `[${field.typicalMin}, ${field.typicalMax}]`,
        isSet(field.absoluteMin) && `absolute [${field.absoluteMin}, ${field.absoluteMax}]`,
    ].filter(f => isSet(f) && f)
    const label = name
    const helperText = [field.type, ...parts].join(', ');

    const handleChecked = (ev, checked: boolean) => {
        setValue(checked)
        setArg(checked)
    }
    const handleChange = (ev) => {
        const newValue = ev.target.value
        setValue(newValue)
        const r = tryParseMemberValue(newValue, field)
        setArg(r.error ? undefined : r.value)
        setError(!!r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setValue(v)
        setArg(!!v)
    }

    if (!setArg)
        return <>
            {name && <code>{name}{":"}</code>}
            <code>{field.type}</code>
            {parts.join(', ')}
            {field.startRepeats && <strong>starts repeating</strong>}
        </>

    if (field.type === 'pipe') {
        return <>pipe <code>{field.name}</code></>
    }
    else if (field.type === 'bool')
        return <>
            <Switch checked={!!value} onChange={handleChecked} />
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
    else // numbers or string
        return <TextField
            label={label}
            value={value || ""}
            helperText={helperText}
            onChange={handleChange}
            required={value === undefined}
            error={error}
        />
}