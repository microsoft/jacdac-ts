import React from "react";
import { Grid, Typography } from "@material-ui/core";

export default function PercentWidget(props: {
    value?: number;
    label: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, color, label } = props;
    const valueVariant = "h1"
    const labelVariant = "h6"

    const percent = isNaN(value) ? "--" : Math.round(value);

    return <Grid container direction="row" justify="center" alignItems="center">
            <Grid item xs>
                <Typography variant={valueVariant}>{percent}</Typography>
            </Grid>
            <Grid xs container direction="column" justify="space-between">
                {label && <Grid item><Typography variant={labelVariant}>{label}</Typography></Grid>}
                <Grid item><Typography variant={labelVariant}>%</Typography></Grid>
            </Grid>
        </Grid>
}