import React from "react";
import { Grid, Typography, useTheme } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";

export default function CircleDotWidget(props: {
    angle?: number;
    stepAngle?: number;
    label?: string
    color?: "primary" | "secondary",
    size?: string
}) {
    const { angle, label, color, size } = props;
    const theme = useTheme();
    const { background, controlBackground, active } = useWidgetTheme(color);

    const w = 64;
    const r = w / 2;
    const rd = 8;
    const cx = r;
    const cy = r;
    const ro = r - rd / 2;
    return <SvgWidget width={w} size={size}>
        <circle cx={cx} cy={cy} r={ro} fill={background} />
        <circle cx={rd} cy={cy} r={rd} fill={active} transform={`rotate(${angle} ${cx} ${cy})`} />
        <text x={cx} y={cy + 6} textAnchor="middle" fill={theme.palette.text.primary}>{label}</text>
    </SvgWidget>
}