import React, { useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import { CircularProgress, Slider, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import { MenuItem, Select, Switch, TextField } from "@material-ui/core";
import { flagsToValue, prettyMemberUnit, valueToFlags } from "../../../../src/jdom/pretty";
import { clampToStorage, isIntegerType, memberValueToString, scaleFloatToInt, scaleIntToFloat, tryParseMemberValue } from "../../../../src/jdom/spec";
import { isSet, pick, roundWithPrecision } from "../../../../src/jdom/utils";
import InputSlider from "../ui/InputSlider";
import { RegisterInputVariant } from "../RegisterInput";
import { useId } from "react-use-id-hook"
import ButtonWidget from "../widgets/ButtonWidget";
import GaugeWidget from "../widgets/GaugeWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import ValueWithUnitWidget from "../widgets/ValueWithUnitWidget";

export default function MemberInput(props: {
    specification: jdspec.PacketMember,
    serviceSpecification: jdspec.ServiceSpec,
    serviceMemberSpecification: jdspec.PacketInfo,
    value: any,
    setValue?: (v: any) => void,
    showDataType?: boolean,
    color?: "primary" | "secondary",
    variant?: RegisterInputVariant,
    min?: number,
    max?: number,
    error?: number
}) {
    const { specification, serviceSpecification, serviceMemberSpecification, value,
        setValue, showDataType, color, variant, min, max, error } = props;
    const { typicalMin, typicalMax, absoluteMin, absoluteMax } = specification;
    const enumInfo = serviceSpecification.enums?.[specification.type]
    const disabled = !setValue;
    const labelid = useId();
    const [errorText, setErrorText] = useState("")
    const [textValue, setTextValue] = useState("")
    const valueString = memberValueToString(value, specification);
    const name = specification.name === "_" ? serviceMemberSpecification.name : specification.name
    const label = name
    const isWidget = variant === "widget" || variant === "offwidget"
    const isOffWidget = variant === "offwidget"
    const widgetSize = useWidgetSize();

    const minValue = pick(min, typicalMin, absoluteMin)
    const maxValue = pick(max, typicalMax, absoluteMax)
    const errorValue = !!error && "±" + roundWithPrecision(error, 1 - Math.floor(Math.log10(error))).toLocaleString();
    const helperText = errorText
        || [prettyMemberUnit(specification, showDataType), errorValue]
            .filter(v => v !== undefined).join(", ");

    const inputType = specification.type === 'string' || specification.type === 'string0' ? "string"
        : specification.isSimpleType || isIntegerType(specification.type) ? "number"
            : "";

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
        setErrorText(r.error)
    }
    const handleEnumChange = (event: React.ChangeEvent<{ value: any }>) => {
        const v = enumInfo.isFlags ? flagsToValue(event.target.value) : event.target.value
        setValue(v)
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
    const percentValueLabelFormat = (v: number) => {
        return `${Math.round(v * 100)}%`
    }
    const offFormat = (v: number) => "off";

    // value hasn't been loaded yet
    if (serviceMemberSpecification.kind !== "command" && value === undefined)
        return <CircularProgress disableShrink variant="indeterminate" size="1rem" />

    //
    if (specification.type === 'pipe') {
        return <>pipe <code>{specification.name}</code></>
    }
    else if (specification.type === 'bool') {
        if (isWidget)
            return <ButtonWidget label={label} checked={!!value} color={color} size={widgetSize} />

        return <>
            <Switch aria-label={label} aria-labelledby={labelid} checked={!!value} onChange={disabled ? undefined : handleChecked} color={color} />
            <label id={labelid}>{label}</label>
        </>
    } else if (enumInfo !== undefined) {
        return <Select
            aria-label={label}
            disabled={disabled}
            multiple={enumInfo.isFlags}
            value={enumInfo.isFlags ? valueToFlags(enumInfo, value) : value}
            onChange={handleEnumChange}>
            {Object.keys(enumInfo.members).map(n => <MenuItem key={n} value={enumInfo.members[n]}>{n}</MenuItem>)}
        </Select>
    }
    else if (specification.unit === "/") {
        const fv = scaleIntToFloat(value, specification);
        if (isWidget)
            return <GaugeWidget
                label={label}
                value={scaleIntToFloat(value, specification)}
                color={color}
                min={0} max={1}
                valueLabel={percentValueLabelFormat}
                size={widgetSize}
                off={isOffWidget}
            />

        return <Slider
            aria-label={label}
            color={color}
            value={fv}
            valueLabelFormat={percentValueFormat}
            onChange={disabled ? undefined : handleScaledSliderChange}
            min={0} max={1} step={0.01}
            valueLabelDisplay="auto"
        />
    } else if (isSet(minValue) && isSet(maxValue)) {
        const hasTypicalRange = isSet(typicalMin) && isSet(typicalMax);
        let step = hasTypicalRange
            ? (specification.typicalMax - specification.typicalMin) / 100
            : (maxValue - minValue) / 100;
        if (step === 0 || isNaN(step)) // edge case
            step = undefined;
        const marks = hasTypicalRange && (typicalMin !== minValue || typicalMax !== maxValue) ? [
            {
                value: specification.typicalMin,
                label: 'min',
            },
            {
                value: specification.typicalMax,
                label: 'max',
            }
        ] : undefined;

        if (isWidget)
            return <ValueWithUnitWidget
                label={specification.unit}
                value={value}
                secondaryLabel={isWidget && errorValue}
                color={color}
                size={widgetSize} />

        return <InputSlider
            value={value}
            color={color}
            valueLabelFormat={isOffWidget ? offFormat : valueLabelFormat}
            onChange={disabled ? undefined : handleSliderChange}
            min={minValue}
            max={maxValue}
            step={step}
            marks={marks}
            type={inputType}
        />
    } else {// numbers or string
        if (isWidget)
            return <ValueWithUnitWidget
                value={roundWithPrecision(value, 2)}
                label={specification.unit}
                color={color}
                size={widgetSize} />

        return <TextField
            spellCheck={false}
            value={textValue}
            helperText={helperText}
            onChange={disabled ? undefined : handleChange}
            required={value === undefined}
            error={!!errorText}
            type={inputType}
        />
    }
}
