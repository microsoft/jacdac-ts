import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";
import Gauge from "./Gauge";

export default function GaugeWidget(props: {
    value?: number;
    label?: string
    color?: "primary" | "secondary",
    size?: string,
    min?: number,
    max?: number,
    valueLabel?: (v: number) => string,
}) {
    const { value, label, color, size, min, max, valueLabel } = props;

    return <Grid container direction="row" justify="center">
        <Grid container justify="center">
            <Gauge
                min={min}
                max={max} 
                value={value} 
                showValue={true} 
                color={color}
                label={valueLabel} />
        </Grid>
        {label && <Grid container justify="center">
            <Typography variant="caption">{label}</Typography>
        </Grid>}
    </Grid>
}