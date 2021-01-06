import React, { useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { CircularProgress, Slider } from "@material-ui/core";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyMemberUnit, prettyUnit, valueToFlags } from "../../../../src/jdom/pretty";
import { memberValueToString, scaleFloatToInt, scaleIntToFloat, tryParseMemberValue } from "../../../../src/jdom/spec";
import IDChip from "../IDChip";
import { isSet, roundWithPrecision } from "../../../../src/jdom/utils";
import InputSlider from "../ui/InputSlider";

export default function MemberInput(props: {
    specification: jdspec.PacketMember,
    serviceSpecification: jdspec.ServiceSpec,
    value: any,
    setValue?: (v: any) => void
}) {
    const { specification, serviceSpecification, value, setValue } = props;
    const enumInfo = serviceSpecification.enums?.[specification.type]
    const disabled = !setValue;
    const [error, setError] = useState("")
    const [textValue, setTextValue] = useState("")
    const valueString = memberValueToString(value, specification);
    const name = specification.name === "_" ? "" : specification.name
    const label = name
    const helperText = error || prettyMemberUnit(specification)

    // update coming from device
    useEffect(() => {
        setTextValue(valueString)
    }, [valueString]);

    const handleChecked = (ev, checked: boolean) => {
        setValue(checked)
    }
    const handleChange = (ev) => {
        const newValue = ev.target.value
        setTextValue(newValue)
        const r = tryParseMemberValue(newValue, specification)
        if (r.value !== undefined)
            setValue(r.value)
        setError(r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setValue(!!v)
    }
    const handleScaledSliderChange = (event: any, newValue: number | number[]) => {
        const scaled = scaleFloatToInt((newValue as number), specification);
        setValue(scaled);
    }
    const handleSliderChange = (newValue: number) => {
        const v = (newValue as number);
        setValue(v);
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
            onChange={handleScaledSliderChange}
            min={0} max={1} step={0.01}
            valueLabelDisplay="auto"
        />
    } else if (isSet(specification.typicalMin) && isSet(specification.typicalMax)) {
        const step = (specification.typicalMax - specification.typicalMin) / 100;
        // TODO: make step nicer
        return <InputSlider
            disabled={disabled}
            value={value}
            valueLabelFormat={valueLabelFormat}
            onChange={handleSliderChange}
            min={specification.typicalMin}
            max={specification.typicalMax}
            step={step}
        />
    } else if (isSet(specification.typicalMin) && isSet(specification.typicalMax)
        && isSet(specification.absoluteMin) && isSet(specification.absoluteMax)) {
        const step = (specification.absoluteMax - specification.absoluteMin) / 100;
        // TODO: make step nicer
        const marks = [
            {
                value: specification.typicalMin,
                label: 'min',
            },
            {
                value: specification.typicalMax,
                label: 'max',
            }
        ];
        return <InputSlider
            value={value}
            valueLabelFormat={valueLabelFormat}
            onChange={disabled ? undefined : handleSliderChange}
            min={specification.absoluteMin}
            max={specification.absoluteMax}
            step={step}
            marks={marks}
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
