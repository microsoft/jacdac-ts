import React, { SVGAttributes, useRef } from "react";
import useWidgetTheme from "./useWidgetTheme";
import { SvgWidget } from "./SvgWidget";
import useThrottledValue from "../hooks/useThrottledValue"
import { closestPoint, describeArc, svgPointerPoint } from "./svgutils";
import { CSSProperties } from "@material-ui/core/styles/withStyles";
import SliderHandle from "./SliderHandle";
import PowerButton from "./PowerButton";

export default function GaugeWidget(props: {
    value: number,
    min: number,
    max: number,
    step?: number,
    label?: string,
    color?: "primary" | "secondary",
    size?: string,
    off?: boolean,
    variant?: "fountain",
    valueLabel?: (v: number) => string,
    onChange?: (newValue: number) => void
}) {
    const { value, label, color, size, min, max, step, variant, valueLabel, off, onChange } = props;
    const { background, active, controlBackground, textProps } = useWidgetTheme(color);

    const sliderPathRef = useRef<SVGPathElement>();
    const w = 120;
    const h = 120;
    const m = 8;
    const roff = 18;
    const sw = m << 1;
    const cx = w >> 1;
    const cy = h >> 1;
    const r = (w >> 1) - m;
    const sa = -135;
    const ea = 135;
    const _step = step || (max - min) / 10
    const displayValue = useThrottledValue(value, (max - min) * 1.619);

    const computeArc = (v: number) => {
        if (variant === "fountain") {
            const mid = (ea + sa) / 2;
            const fraction = v / (max - min) * (ea - sa);
            if (fraction < 0)
                return describeArc(cx, cy, r, mid + fraction, mid);
            else
                return describeArc(cx, cy, r, mid, mid + fraction);
        } else {
            const fraction = (v - min) / (max - min);
            const va = sa + fraction * (ea - sa);
            return describeArc(cx, cy, r, sa, va);
        }
    }

    const db = describeArc(cx, cy, r, sa, ea);
    const dvalue = computeArc(value);
    const dactual = computeArc(displayValue);
    const lineCap = "round"
    const tvalue = valueLabel(value);
    const vlabel = !off && tvalue;
    const clickeable = !!onChange;

    const handleTurnOn = () => {

    }
    const handlePointerDown = (ev: React.PointerEvent<SVGPathElement>) => {
        ev.preventDefault();
        if (!ev.buttons) return;
        const svg = sliderPathRef.current.ownerSVGElement
        const pos = svgPointerPoint(svg, ev);
        const closest = closestPoint(sliderPathRef.current, _step, pos);
        console.log({ pos, closest })
        onChange(min + (1 - closest) * (max - min))
    }
    const pointerStyle: CSSProperties = clickeable && {
        cursor: "pointer"
    }
    const pathProps: SVGAttributes<SVGPathElement> = {
        onPointerDown: clickeable && handlePointerDown,
        onPointerMove: clickeable && handlePointerDown,
        style: clickeable && pointerStyle
    }

    return <SvgWidget width={w} height={h} size={size}>
        <path ref={sliderPathRef} strokeWidth={sw} stroke={background} d={db} strokeLinecap={lineCap} fill="transparent"
            {...pathProps}
        />
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dvalue} opacity={0.2} fill="transparent"
            {...pathProps}
        />}
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dactual} fill="transparent"
            {...pathProps}
        />}
        {sliderPathRef.current && value !== undefined && <SliderHandle
            pathRef={sliderPathRef.current}
            value={value} valueText={tvalue}
            min={min} max={max} step={_step}
            label={`${label} slider`}
            r={m - 1}
            fill={controlBackground}
            stroke={active}
            strokeWidth={2}
            onValueChange={!off && onChange}
        />}
        {off && <PowerButton cx={cx} cy={cy} r={roff} color={color} onClick={handleTurnOn} />}
        {vlabel && <text x={cx} y={cy} {...textProps}>{vlabel}</text>}
        {label && <text x={w >> 1} y={h - m} {...textProps}>{label}</text>}
    </SvgWidget>
}