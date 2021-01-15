import React from "react";
import { Grid, Typography } from "@material-ui/core";
import Gauge from "./Gauge";

export default function GaugeWidget(props: {
    value?: number;
    label?: string
    color?: "primary" | "secondary",
    size?: string,
    min?: number,
    max?: number,
    off?: boolean,
    valueLabel?: (v: number) => string,
}) {
    const { value, label, color, size, min, max, valueLabel, off } = props;
    const offFormat = (v: number) => "off";

    return <Grid container direction="row" justify="center">
        <Grid container justify="center">
            <Gauge
                size={size}
                min={min}
                max={max}
                value={value}
                showValue={!!valueLabel || off}
                color={color}
                label={off ? offFormat : valueLabel} />
        </Grid>
        {label && <Grid container justify="center">
            <Typography variant="caption">{label}</Typography>
        </Grid>}
    </Grid>
}