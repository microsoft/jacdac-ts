import React from "react";
import { Grid, Typography } from "@material-ui/core";
import useWidgetTheme from "./useWidgetTheme";
import { SvgWidget } from "./SvgWidget";

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
    valueLabel?: (v: number) => string,
}) {
    const { value, label, color, size, min, max, valueLabel, off } = props;
    const { background, active, textPrimary } = useWidgetTheme(color);

    const w = 120;
    const h = 120;
    const m = 8;
    const sw = m << 1;
    const cx = w >> 1;
    const cy = h >> 1;
    const r = (w >> 1) - m;
    const sa = -135;
    const ea = 135;
    const fraction = (value - min) / (max - min);
    const va = sa + fraction * (ea - sa);
    const db = describeArc(cx, cy, r, sa, ea);
    const dv = describeArc(cx, cy, r, sa, va);

    return <SvgWidget width={w} height={h} size={size}>
        <path strokeWidth={sw} stroke={background} d={db} fill="transparent" />
        {!off && <path strokeWidth={sw} stroke={active} d={dv} fill="transparent" />}
        {(valueLabel || off) && <text x={cx} y={cy} fill={textPrimary} textAnchor="middle">{off ? "off" : valueLabel(value)}</text>}
        {label && <text x={w >> 1} y={h - m} textAnchor={"middle"} fill={textPrimary}>{label}</text>}
    </SvgWidget>
}