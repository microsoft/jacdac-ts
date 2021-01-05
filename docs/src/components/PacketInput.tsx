// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import React, { useContext, useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { CircularProgress, Grid, List, ListItem, Slider } from "@material-ui/core";
import { JDRegister } from "../../../src/jdom/register";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyUnit, valueToFlags } from "../../../src/jdom/pretty";
import { memberValueToString, scaleFloatToInt, scaleIntToFloat, tryParseMemberValue } from "../../../src/jdom/spec";
import IDChip from "./IDChip";
import { JDField } from "../../../src/jdom/field";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import AppContext from "./AppContext";
import { roundWithPrecision } from "../../../src/jdom/utils";

function isSet(field: any) {
    return field !== null && field !== undefined
}

function FieldInput(props: {
    field: JDField,
    value: any,
    setArg: (v: any) => void
}) {
    const { field, value, setArg } = props;
    const { specification } = field;
    const disabled = !setArg;
    const enumInfo = field.register.service.specification?.enums?.[specification.type]
    const [error, setError] = useState("")
    const [textValue, setTextValue] = useState("")
    const valueString = memberValueToString(value, specification);
    const name = specification.name === "_" ? "" : specification.name
    const parts: string[] = [
        prettyUnit(specification.unit),
        isSet(specification.typicalMin) && `[${specification.typicalMin}, ${specification.typicalMax}]`,
        isSet(specification.absoluteMin) && `absolute [${specification.absoluteMin}, ${specification.absoluteMax}]`,
    ].filter(f => isSet(f) && f)
    const label = name
    const helperText = error || [specification.type, ...parts].join(', ')

    // update coming from device
    useEffect(() => {
        setTextValue(valueString)
    }, [valueString]);

    const handleChecked = (ev, checked: boolean) => {
        setArg(checked)
    }
    const handleChange = (ev) => {
        const newValue = ev.target.value
        setTextValue(newValue)
        const r = tryParseMemberValue(newValue, specification)
        if (r.value !== undefined)
            setArg(r.value)
        setError(r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setArg(!!v)
    }
    const handleSliderChange = async (event: any, newValue: number | number[]) => {
        const scaled = scaleFloatToInt((newValue as number), specification);
        setArg(scaled);
    }

    const valueLabelFormat = (value: number) => {
        // avoid super long floats
        return roundWithPrecision(value, 2);
    }

    // value hasn't been loaded yet
    if (value === undefined)
        return <CircularProgress disableShrink variant="indeterminate" size="1rem" />

    //
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
    else if (specification.unit === "/") {
        return <Slider
            disabled={disabled}
            value={scaleIntToFloat(value, specification)}
            valueLabelFormat={valueLabelFormat}
            onChange={handleSliderChange}
            min={0} max={1} step={0.01}
            valueLabelDisplay="auto"
        />
    }
    else // numbers or string
        return <TextField
            disabled={disabled}
            label={label}
            value={textValue}
            helperText={helperText}
            onChange={handleChange}
            required={value === undefined}
            error={!!error}
        />
}

export default function PacketInput(props: {
    register: JDRegister
}) {
    const { register } = props;
    const { specification } = register;
    const { fields } = register;
    const { setError: setAppError } = useContext(AppContext)
    const [working, setWorking] = useState(false);
    const [args, setArgs] = useState<any[]>(register.unpackedValue || [])

    useEffect(() => register.subscribe(REPORT_UPDATE, () => {
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
        return <Alert severity="error">{`Unknown member ${register.service}:${register.address}`}</Alert>
    const hasSet = specification.kind === "rw";
    const setArg = (index: number) => (arg: any) => {
        const c = args.slice(0)
        c[index] = arg;
        sendArgs(c);
    }

    if (!fields.length)
        return null; // nothing to see here

    return <Grid container spacing={1}>
        {fields.map((field, fieldi) => <Grid item key={fieldi} xs={12}>
            <FieldInput field={field} value={args[fieldi]} setArg={hasSet && setArg(fieldi)} />
        </Grid>)}
    </Grid>
}