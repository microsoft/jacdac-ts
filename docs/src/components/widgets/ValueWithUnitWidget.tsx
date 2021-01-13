import React from "react";
import { createStyles, makeStyles, Typography } from "@material-ui/core";

const useStyles = makeStyles((theme) => createStyles({
    gridContainer: {
        display: "grid",
        gridTemplateColumns: "4fr 1fr",
        gridTemplateRows: "3.5fr 0.5fr",
        gap: `${theme.spacing(0.5)} ${theme.spacing(0.5)}`,
        gridTemplateAreas: `
        "value upper-unit"
        "value lower-unit"
`
    },
    value: { gridArea: "value" },
    upperUnit: { gridArea: "upper-unit" },
    lowerUnit: { gridArea: "lower-unit" }
}));

export default function ValueWithUnitWidget(props: {
    value?: number;
    label: string,
    secondaryLabel?: string,
    color?: "primary" | "secondary",
    size?: string
}) {
    const { value, secondaryLabel, label } = props;
    const labelVariant = "body2";
    const classes = useStyles();
    const valueText = isNaN(value) ? "--" : value.toLocaleString();
    const valueTextLength = valueText.length;

    const valueVariant = valueTextLength < 3 ? "h1"
        : valueTextLength < 8 ? "h3"
            : valueTextLength < 12 ? "h5"
                : "h6";

    return <div className={classes.gridContainer}>
        <div className={classes.value}>
            <Typography align="right" variant={valueVariant}>{valueText}</Typography>
        </div>
        {label && <div className={classes.upperUnit}>
            <Typography variant={labelVariant}>{label}</Typography>
        </div>}
        {secondaryLabel && <div className={classes.lowerUnit}>
            <Typography variant={labelVariant}>{secondaryLabel}</Typography>
        </div>}
    </div>;
}