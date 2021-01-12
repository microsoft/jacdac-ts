import React from "react";
import { Grid, Typography, useTheme } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";

export default function ButtonWidget(props: {
    checked?: boolean;
    label?: string
    color?: "primary" | "secondary",
    size?: string,
    onClick?: () => void
}) {
    const { checked, label, color, size, onClick } = props;
    const { background, controlBackground, active } = useWidgetTheme(color);
    const theme = useTheme();

    const w = 64;
    const mo = checked ? 3 : 5;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const ri = r - mo;
    return <SvgWidget width={w} size={size}>
        <circle cx={cx} cy={cy} r={ro} fill={background} />
        <circle cx={cx} cy={cy} r={ri} fill={checked ? active : controlBackground} onClick={onClick} />
        <text x={cx} y={cy + 6} textAnchor="middle" fill={theme.palette.text.primary}>{label}</text>
    </SvgWidget>
}