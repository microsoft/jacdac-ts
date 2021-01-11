import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";

export default function CircleDotWidget(props: {
    angle?: number;
    label?: string
    color?: "primary" | "secondary",
    size?: string
}) {
    const { angle, label, color, size } = props;
    const { background, controlBackground, active } = useWidgetTheme(color);

    const w = 64;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const rd = 8;
    return <Grid container direction="row" justify="center">
        <Grid container justify="center">
            <SvgWidget width={w} size={size}>
                <circle cx={cx} cy={cy} r={ro} fill={background} />
                <circle cx={0} cy={ro} r={rd} fill={active} transform={`rotate(${angle} ${-ro} ${-ro})`} />
            </SvgWidget>
        </Grid>
        {label && <Grid container justify="center">
            <Typography variant="caption">{label}</Typography>
        </Grid>}
    </Grid>
}