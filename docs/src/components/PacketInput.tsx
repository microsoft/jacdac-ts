// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import React, { useContext, useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { List, ListItem } from "@material-ui/core";
import { JDRegister } from "../../../src/jdom/register";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyUnit, valueToFlags } from "../../../src/jdom/pretty";
import { tryParseMemberValue } from "../../../src/jdom/spec";
import IDChip from "./IDChip";
import { JDField } from "../../../src/jdom/field";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import AppContext from "./AppContext";

function isSet(field: any) {
    return field !== null && field !== undefined
}

function FieldInput(props: {
    field: JDField,
    showMemberName?: boolean,
    value: any,
    setArg: (v: any) => void
}) {
    const { field, showMemberName, value, setArg } = props;
    const { specification, register } = field;
    const disabled = !setArg;
    const enumInfo = field.register.service.specification?.enums?.[specification.type]
    const [error, setError] = useState(false);
    const name = showMemberName ? (specification.name === "_" ? register.name : specification.name) : ""
    const parts: string[] = [
        prettyUnit(specification.unit),
        isSet(specification.typicalMin) && `[${specification.typicalMin}, ${specification.typicalMax}]`,
        isSet(specification.absoluteMin) && `absolute [${specification.absoluteMin}, ${specification.absoluteMax}]`,
    ].filter(f => isSet(f) && f)
    const label = name
    const helperText = [specification.type, ...parts].join(', ');

    const handleChecked = (ev, checked: boolean) => {
        setArg(checked)
    }
    const handleChange = (ev) => {
        const newValue = ev.target.value
        //    setValue(newValue)
        const r = tryParseMemberValue(newValue, specification)
        setArg(r.error ? undefined : r.value)
        setError(!!r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
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
    register: JDRegister,
    showMemberName?: boolean
}) {
    const { register, showMemberName } = props;
    const { specification } = register;
    const { fields } = register;
    const { setError: setAppError } = useContext(AppContext)
    const [working, setWorking] = useState(false);
    const [args, setArgs] = useState<any[]>(register.unpackedValue || [])

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
        console.log(`report updated`)
        const vs = register.unpackedValue
        if (vs !== undefined)
            setArgs(vs);
    }), [register]);

    const sendArgs = async (values: any[]) => {
        if (working) return;
        try {
            setWorking(true)
            await register.sendSetPackedAsync(specification.packFormat, values, true);
        }
        catch (e) {
            setAppError(e)
        } finally {
            setWorking(false)
        }
    }

    if (!specification)
        return <Alert severity="error">{`Unknown register ${register.service}:${register.address}`}</Alert>
    const hasSet = specification.kind === "rw";
    const setArg = (index: number) => (arg: any) => {
        const c = args.slice(0)
        c[index] = arg;
        sendArgs(c);
    }

    if (!fields.length)
        return null; // nothing to see here

    return fields.length < 1 ?
        <FieldInput field={fields[0]} value={args[0]} showMemberName={showMemberName} setArg={hasSet && setArg(0)} />
        : <List dense={true}>
            {fields.map((field, fieldi) => <ListItem>
                <FieldInput field={field} value={args[fieldi]} showMemberName={showMemberName} setArg={hasSet && setArg(fieldi)} />
            </ListItem>)}
        </List>
}