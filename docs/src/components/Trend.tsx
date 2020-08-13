import React from "react"
import { DataSet } from "./DataSet";
import { unique } from "../../../src/dom/utils";
import { Paper, makeStyles, createStyles } from "@material-ui/core";
import clsx from 'clsx';

const useStyles = makeStyles((theme) => createStyles({
    root: {
    },
    graph: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    mini: {
        display: "inline-block",
        width: "10rem"
    }
}));

export interface TrendProps {
    dataSet: DataSet,
    dot?: boolean;
    gradient?: boolean;
}

function UnitTrend(props: {
    unit: string,
    horizon?: number,
    width?: number,
    height?: number,
} & TrendProps) {
    const { dataSet, unit, horizon, width, height, dot, gradient } = props;
    const { rows } = dataSet;
    const classes = useStyles()

    if (rows.length < 2)
        return <></>

    const vpw = width || 80;
    const vph = height || 15;
    const indexes = dataSet.units
        .map((u, index) => (u || "frac") === unit ? index : undefined)
        .filter(index => index !== undefined)
    const headers = indexes.map(i => dataSet.headers[i])
    const colors = indexes.map(i => dataSet.colors[i])
    const data = rows.slice(-horizon)
    const useGradient = gradient || data.length < rows.length
    const times = data.map(ex => ex.timestamp)
    const maxt = Math.max.apply(null, times);
    const mint = Math.min.apply(null, times);
    let minv = unit == "frac" ? 0 : Math.max.apply(null, indexes.map(i => dataSet.mins[i]));
    let maxv = unit == "frac" ? 1 : Math.max.apply(null, indexes.map(i => dataSet.maxs[i]));
    if (isNaN(minv) && isNaN(maxv)) {
        minv = 0
        maxv = 1
    }
    const rv = maxv - minv;

    const margin = 2;
    const h = (maxv - minv) || 10;
    const w = (maxt - mint) || 10;

    const strokeWidth = 0.25
    const pointRadius = strokeWidth * 2
    const toffset = - pointRadius * 3

    function x(t: number) {
        return (t - mint) / w * vpw
    }
    function y(v: number) {
        if (v === undefined || isNaN(v))
            v = minv;
        // adding random for lineragradient bug workaround
        // which does not render perfectly
        // horizontal lines
        return (Math.random() * 0.0001 * rv - (v - minv)) / h * (vph - 2 * margin)
    }
    const lastRow = data[data.length - 1]

    return (
        <Paper className={classes.graph} square>
            <svg viewBox={`0 0 ${vpw} ${vph}`}>
                {useGradient && <defs>
                    {indexes.map((index, i) =>
                        <linearGradient key={`grad${i}`} id={`gradient${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopOpacity="0" stopColor={colors[i]} />
                            <stop offset="5%" stopOpacity="0" stopColor={colors[i]} />
                            <stop offset="40%" stopOpacity="1" stopColor={colors[i]} />
                            <stop offset="100%" stopOpacity="1" stopColor={colors[i]} />
                        </linearGradient>)}
                </defs>}
                {indexes.map((index, i) => {
                    const color = colors[i]
                    const points =
                        data.map(row => `${x(row.timestamp)},${y(row.data[index])}`).join(' ');
                    const header = headers[i]
                    return <g key={`line${index}`} transform={`translate(${toffset}, ${vph - margin})`}>
                        <polyline points={points} fill="none" stroke={useGradient ? `url(#gradient${index})` : color} strokeWidth={strokeWidth} stroke-linejoin="round" />
                        {dot && <circle cx={x(lastRow.timestamp)} cy={y(lastRow.data[index])} r={pointRadius} fill={color} />}
                    </g>
                })}
            </svg>
        </Paper>
    )
}


export default function Trend(props: {
    horizon?: number,
    width?: number,
    height?: number,
    mini?: boolean
} & TrendProps) {
    const { dataSet, mini } = props;
    const { rows } = dataSet;
    const classes = useStyles()

    if (!rows.length)
        return <></>

    const units = unique(dataSet.units.map(unit => unit || "frac"))
    return <div className={clsx(classes.root, mini && classes.mini)}>
        {units.map(unit => <UnitTrend key={`graph${unit}`} unit={unit} {...props} />)}
    </div>
}