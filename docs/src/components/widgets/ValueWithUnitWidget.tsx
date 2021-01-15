import React from "react";
import { Grid, Typography } from "@material-ui/core";

export default function ValueWithUnitWidget(props: {
    value?: number;
    label: string,
    secondaryLabel?: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, secondaryLabel, label } = props;
    const labelVariant = "subtitle1";
    const valueText = isNaN(value) ? "--" : value.toLocaleString();
    const valueTextLength = valueText.replace(/[\.s]/g, '').length;

    const valueVariant = valueTextLength < 3 ? "h1"
        : valueTextLength < 5 ? "h2"
            : valueTextLength < 7 ? "h3"
                : valueTextLength < 9 ? "h4"
                    : "h6";

    return <Grid container direction="row" alignContent="flex-end">
        <Grid item>
            <Typography align="right" variant={valueVariant}>{valueText}</Typography>
        </Grid>
        {(label || secondaryLabel) && <Grid item>
            <Grid container direction="column" alignContent="space-between">
                {label && <Grid item>
                    <Typography variant={labelVariant}>{label}</Typography>
                </Grid>}
                {secondaryLabel && <Grid item>
                    <Typography variant={"caption"}>{secondaryLabel}</Typography>
                </Grid>}
            </Grid>
        </Grid>}
    </Grid>;
}