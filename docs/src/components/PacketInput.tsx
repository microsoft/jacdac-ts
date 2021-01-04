import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import React, { useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { List, ListItem } from "@material-ui/core";
import { JDRegister } from "../../../src/jdom/register";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyUnit, valueToFlags } from "../../../src/jdom/pretty";
import { tryParseMemberValue } from "../../../src/jdom/spec";
import IDChip from "./IDChip";
import { JDField } from "../../../src/jdom/field";

function isSet(field: any) {
    return field !== null && field !== undefined
}

function FieldInput(props: {
    field: JDField,
    setArg: (v: any) => void
}) {
    const { field, setArg } = props;
    const { specification } = field;
    const disabled = !setArg;
    const enumInfo = field.register.service.specification?.enums?.[specification.type]
    const [value, setValue] = useState<any>("")
    const [error, setError] = useState(false)ß
    const name = field.name !== "_" ? field.name : ""
    const parts: string[] = [
        prettyUnit(field.unit),
        isSet(specification.typicalMin) && `[${specification.typicalMin}, ${specification.typicalMax}]`,
        isSet(specification.absoluteMin) && `absolute [${specification.absoluteMin}, ${specification.absoluteMax}]`,
    ].filter(f => isSet(f) && f)
    const label = name
    const helperText = [specification.type, ...parts].join(', ');

    const handleChecked = (ev, checked: boolean) => {
        setValue(checked)
        setArg(checked)
    }
    const handleChange = (ev) => {
        const newValue = ev.target.value
        setValue(newValue)
        const r = tryParseMemberValue(newValue, specification)
        setArg(r.error ? undefined : r.value)
        setError(!!r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setValue(v)
        setArg(!!v)
    }

    if (specification.type === 'pipe') {
        return <>pipe <code>{specification.name}</code></>
    }
    else if (specification.type === 'bool')
        return <>
            <Switch checked={!!value} onChange={handleChecked} disabled={disabled} />
            {label}
        </>
    else if (enumInfo !== undefined) {
        return <Select
            disabled={disabled}
            multiple={enumInfo.isFlags}
            value={enumInfo.isFlags ? valueToFlags(enumInfo, value) : value}
            onChange={handleEnumChange}>
            {Object.keys(enumInfo.members).map(n => <MenuItem key={n} value={enumInfo.members[n]}>{n}
                <IDChip id={enumInfo.members[n]} /></MenuItem>)}
        </Select>
    }
    else // numbers or string
        return <TextField
            disabled={disabled}
            label={label}
            value={value || ""}
            helperText={helperText}
            onChange={handleChange}
            required={value === undefined}
            error={error}
        />
}

export default function PacketInput(props: {
    register: JDRegister
}) {
    const { register } = props;
    const { specification, decoded } = register;
    const [args, setArgs] = useState<any[]>(decoded?.decoded.map(d => d.value))
    if (!specification)
        return <Alert severity="error">{`Unknown register ${register.service}:${register.address}`}</Alert>
    const { fields } = register;
    const hasSet = specification.kind !== "rw" 
        && specification.kind !== "command";
    const setArg = (index: number) => (arg: any) => {
        const c = args.slice(0)
        c[index] = arg;
        setArgs(c)
        if (hasSet) {

        }
    }

    if (!fields.length)
        return null; // nothing to see here

    return <List>
        {fields.map((field, fieldi) => <ListItem>
            <FieldInput field={field} setArg={hasSet && setArg(fieldi)} />
        </ListItem>)}
    </List>
}