import React from "react";
import { CircularProgress, Grid, Slider, Typography, useMediaQuery, useTheme } from "@material-ui/core";

export default function ArcadeButton(props: {
    checked?: boolean;
    label?: string
    color?: "primary" | "secondary",
    size?: string
}) {
    const { checked, label, color, size } = props;
    const theme = useTheme();
    const { palette } = theme;
    const { background } = palette;

    const w = 64;
    const mo = checked ? 3 : 5;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const ri = r - mo;
    const pcolor: string = !checked ? palette.background.paper
        : color === "primary" ? palette.primary.main
            : color === "secondary" ? palette.secondary.main
                : palette.info.main;

    return <Grid container direction="row" justify="center">
        <Grid container justify="center">
            <svg viewBox={`0 0 ${w} ${w}`} style={size && { width: size, height: size }}>
                <circle cx={cx} cy={cy} r={ro} fill={background.default} />
                <circle cx={cx} cy={cy} r={ri} fill={pcolor} />
            </svg>
        </Grid>
        {label && <Grid container justify="center">
            <Typography variant="caption">{label}</Typography>
        </Grid>}
    </Grid>
}