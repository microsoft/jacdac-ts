import React from "react";
import { Grid, Typography } from "@material-ui/core";

export default function PercentWidget(props: {
    value?: number;
    label: string,
    secondaryLabel?: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, secondaryLabel, color, label } = props;
    const valueVariant = "h1"
    const labelVariant = "h6"

    const percent = isNaN(value) ? "--" : Math.round(value);

    return <Grid container direction="row" justify="center" alignItems="center">
            <Grid item xs>
                <Typography variant={valueVariant}>{percent}</Typography>
            </Grid>
            <Grid container direction="column" justify="space-between">
                <Grid item><Typography variant={labelVariant}>{label}</Typography></Grid>
                {secondaryLabel && <Grid item><Typography variant={labelVariant}>{secondaryLabel}</Typography></Grid>}
            </Grid>
        </Grid>
}