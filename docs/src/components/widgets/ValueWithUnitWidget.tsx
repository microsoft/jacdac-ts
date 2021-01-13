import React from "react";
import { Grid, Typography } from "@material-ui/core";

export default function ValueWithUnitWidget(props: {
    value?: number;
    label: string,
    secondaryLabel?: string,
    helperText?: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, secondaryLabel, helperText, color, label } = props;
    const labelVariant = "h6"

    const percent = isNaN(value) ? "--" : value.toLocaleString();
    const valueVariant = percent.length < 3 ? "h1"
        : percent.length < 5 ? "h2"
        : percent.length < 7 ? "h3"
        : percent.length < 9 ? "h4"
        : "h5";

    return <Grid container direction="row" justify="center" alignItems="center">
            <Grid item xs>
                <Typography variant={valueVariant}>{percent}</Typography>
                {helperText && <Typography variant="caption">{helperText}</Typography>}
            </Grid>
            <Grid container direction="column" justify="space-between">
                <Grid item><Typography variant={labelVariant}>{label}</Typography></Grid>
                {secondaryLabel && <Grid item><Typography variant={labelVariant}>{secondaryLabel}</Typography></Grid>}
            </Grid>
        </Grid>
}