import React from "react";
import useWidgetTheme from "./useWidgetTheme";
import { SvgWidget } from "./SvgWidget";
import useThrottledValue from "../hooks/useThrottledValue"

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {

    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return d;
}

export default function GaugeWidget(props: {
    value?: number,
    label?: string,
    color?: "primary" | "secondary",
    size?: string,
    min?: number,
    max?: number,
    off?: boolean,
    variant?: "fountain",
    valueLabel?: (v: number) => string,
}) {
    const { value, label, color, size, min, max, variant, valueLabel, off } = props;
    const { background, active, textPrimary } = useWidgetTheme(color);
    const displayValue = useThrottledValue(value, (max - min) * 1.619);

    const w = 120;
    const h = 120;
    const m = 8;
    const sw = m << 1;
    const cx = w >> 1;
    const cy = h >> 1;
    const r = (w >> 1) - m;
    const sa = -135;
    const ea = 135;

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
    return <SvgWidget width={w} height={h} size={size}>
        <path strokeWidth={sw} stroke={background} d={db} strokeLinecap={lineCap} fill="transparent" />
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dvalue} opacity={0.2} fill="transparent" />}
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dactual} fill="transparent" />}
        {(valueLabel || off) && <text x={cx} y={cy} fill={textPrimary} textAnchor="middle">{off ? "off" : valueLabel(value)}</text>}
        {label && <text x={w >> 1} y={h - m} textAnchor={"middle"} fill={textPrimary}>{label}</text>}
    </SvgWidget>
}