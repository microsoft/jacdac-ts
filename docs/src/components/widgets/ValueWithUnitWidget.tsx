import React from "react";
import { createStyles, Grid, makeStyles, Typography } from "@material-ui/core";

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
    const { value, secondaryLabel, color, label } = props;
    const labelVariant = "body2"
    const classes = useStyles();

    const percent = isNaN(value) ? "--" : value.toLocaleString();
    const valueVariant = percent.length < 3 ? "h1"
        : percent.length < 5 ? "h2"
            : percent.length < 7 ? "h3"
                : percent.length < 9 ? "h4"
                    : "h5";

    return <div className={classes.gridContainer}>
        <div className={classes.value}>
            <Typography align="right" variant={valueVariant}>{percent}</Typography>
        </div>
        {label && <div className={classes.upperUnit}>
            <Typography variant={labelVariant}>{label}</Typography>
        </div>}
        {secondaryLabel && <div className={classes.lowerUnit}>
            <Typography variant={labelVariant}>{secondaryLabel}</Typography>
        </div>}
    </div>;
}