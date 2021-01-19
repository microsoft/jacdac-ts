import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { isSet, roundWithPrecision } from "../../../../src/jdom/utils";

export default function ValueWithUnitWidget(props: {
    value: number,
    min?: number,
    max?: number,
    step?: number,
    label: string,
    secondaryLabel?: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, min, max, step, secondaryLabel, label } = props;
    const labelVariant = "subtitle1";
    const precision = step === undefined ? 1 : Math.floor(-Math.log10(step))
    const valueText = isNaN(value) ? "--" : roundWithPrecision(value, precision).toLocaleString();
    const valueTextLength = isSet(min) && isSet(max) ? [min, max]
        .map(v => roundWithPrecision(v, precision).toLocaleString().length)
        .reduce((l, r) => Math.max(l, r), 0)
        + precision : valueText.length;

    //console.log({ min, max, step, precision })
    const valueVariant = valueTextLength < 4 ? "h1"
        : valueTextLength < 7 ? "h2"
            : valueTextLength < 9 ? "h3"
                : valueTextLength < 12 ? "h4"
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