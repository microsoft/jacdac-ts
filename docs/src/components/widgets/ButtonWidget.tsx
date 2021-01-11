import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";

export default function ButtonWidget(props: {
    checked?: boolean;
    label?: string
    color?: "primary" | "secondary",
    size?: string
}) {
    const { checked, label, color, size } = props;
    const { background, controlBackground, active } = useWidgetTheme(color);

    const w = 64;
    const mo = checked ? 3 : 5;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const ri = r - mo;
    return <Grid container direction="row" justify="center">
        <Grid container justify="center">
            <SvgWidget width={w} size={size}>
                <circle cx={cx} cy={cy} r={ro} fill={background} />
                <circle cx={cx} cy={cy} r={ri} fill={checked ? active : controlBackground} />
            </SvgWidget>
        </Grid>
        {label && <Grid container justify="center">
            <Typography variant="caption">{label}</Typography>
        </Grid>}
    </Grid>
}