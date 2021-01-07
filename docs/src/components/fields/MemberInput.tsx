import React, { useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { CircularProgress, Grid, Slider, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyMemberUnit, valueToFlags } from "../../../../src/jdom/pretty";
import { clampToStorage, memberValueToString, scaleFloatToInt, scaleIntToFloat, tryParseMemberValue } from "../../../../src/jdom/spec";
import IDChip from "../IDChip";
import { isSet, roundWithPrecision } from "../../../../src/jdom/utils";
import InputSlider from "../ui/InputSlider";
import CircularProgressBox from "../ui/CircularProgressBox";

export default function MemberInput(props: {
    specification: jdspec.PacketMember,
    serviceSpecification: jdspec.ServiceSpec,
    serviceMemberSpecification: jdspec.PacketInfo,
    value: any,
    setValue?: (v: any) => void,
    showDataType?: boolean,
    color?: "primary" | "secondary"
}) {
    const { specification, serviceSpecification, serviceMemberSpecification, value, setValue, showDataType, color } = props;
    const enumInfo = serviceSpecification.enums?.[specification.type]
    const disabled = !setValue;
    const [error, setError] = useState("")
    const [textValue, setTextValue] = useState("")
    const valueString = memberValueToString(value, specification);
    const name = (specification.name === "_" && serviceMemberSpecification?.name) || specification.name
    const label = name
    const helperText = error || prettyMemberUnit(specification, showDataType)
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));

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
        const clamped = clampToStorage(scaled, specification.storage)
        setValue(clamped);
    }
    const handleSliderChange = (newValue: number) => {
        const v = (newValue as number);
        setValue(v);
    }

    const percentValueFormat = (value: number) => {
        // avoid super long floats
        return ((value * 100) >> 0) + "%"
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
        const fv = scaleIntToFloat(value, specification);
        if (disabled)
            return <Grid container justify="center"><Grid item><CircularProgressBox
                progressColor={color}
                progress={fv * 100}
                progressSize={mobile ? "11vh" : "15vh"}>
                <Grid container>
                    <Grid item xs={12}><Typography variant={mobile ? "h5" : "h4"} align="center">{percentValueFormat(fv)}</Typography></Grid>
                    <Grid item xs={12}><Typography variant={"body2"} align="center">{name}</Typography></Grid>
                </Grid>
            </CircularProgressBox></Grid></Grid>
        else
            return <Slider
                color={color}
                value={fv}
                valueLabelFormat={percentValueFormat}
                onChange={handleScaledSliderChange}
                min={0} max={1} step={0.01}
                valueLabelDisplay="auto"
            />
    } else if (isSet(specification.typicalMin) && isSet(specification.typicalMax)) {
        const step = (specification.typicalMax - specification.typicalMin) / 100;
        // TODO: make step nicer
        return <InputSlider
            value={value}
            color={color}
            valueLabelFormat={valueLabelFormat}
            onChange={disabled ? undefined : handleSliderChange}
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
            label={label}
            value={textValue}
            helperText={helperText}
            onChange={disabled ? undefined : handleChange}
            required={value === undefined}
            error={!!error}
        />
}
