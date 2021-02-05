import React from "react"
import FieldDataSet, { Example } from "./FieldDataSet";
import { unique } from "../../../src/jdom/utils";
import { Paper, makeStyles, createStyles } from "@material-ui/core";
import clsx from 'clsx';

const useStyles = makeStyles((theme) => createStyles({
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
    dataSet: FieldDataSet,
    dot?: boolean;
    gradient?: boolean;
}

function UnitTrendChart(props: {
    data: Example[],
    useGradient: boolean,
    unit: string,
    horizon?: number,
    vpw: number,
    vph: number,
} & TrendProps) {
    const { dataSet, useGradient, data, unit, horizon, vpw, vph, dot, gradient } = props;

    const shape = unit == "#" ? "step" : "line"
    const symmetric = unit == "g" ? true : false

    const indexes = dataSet.units
        .map((u, index) => (u || "/") === unit ? index : undefined)
        .filter(index => index !== undefined)
    const colors = indexes.map(i => dataSet.colors[i])
    const times = data.map(ex => ex.timestamp)
    const maxt = Math.max.apply(null, times);
    const mint = Math.min.apply(null, times);
    let minv = unit == "/" ? 0 : Math.min.apply(null, indexes.map(i => dataSet.mins[i]));
    let maxv = unit == "/" ? 1 : Math.max.apply(null, indexes.map(i => dataSet.maxs[i]));
    let opposite = unit != "/" && Math.sign(minv) != Math.sign(maxv)
    if (isNaN(minv) && isNaN(maxv)) {
        minv = 0
        maxv = 1
    }
    if (symmetric) {
        maxv = Math.max(Math.abs(minv), Math.abs(maxv))
        minv = -maxv
    }
    const rv = maxv - minv;

    const margin = 2;
    const h = (maxv - minv) || 10;
    const w = (maxt - mint) || 10;

    const strokeWidth = 0.25
    const axisWidth = 0.2
    const axisColor = "#ccc"
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
        <>
            {useGradient && <defs>
                <linearGradient key={`gradaxis`} id={`gradientaxis`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopOpacity="0" stopColor={axisColor} />
                    <stop offset="5%" stopOpacity="0" stopColor={axisColor} />
                    <stop offset="40%" stopOpacity="1" stopColor={axisColor} />
                    <stop offset="100%" stopOpacity="1" stopColor={axisColor} />
                </linearGradient>
                {indexes.map((index, i) =>
                    <linearGradient key={`grad${i}`} id={`gradient${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopOpacity="0" stopColor={colors[i]} />
                        <stop offset="5%" stopOpacity="0" stopColor={colors[i]} />
                        <stop offset="40%" stopOpacity="1" stopColor={colors[i]} />
                        <stop offset="100%" stopOpacity="1" stopColor={colors[i]} />
                    </linearGradient>)}
            </defs>}
            <g transform={`translate(${toffset}, ${vph - margin})`}>
                {opposite && <line x1={x(mint)} x2={x(maxt)} y1={y(0)} y2={y(0)} strokeWidth={axisWidth} stroke={useGradient ? `url(#gradientaxis)` : axisColor} />}
                {indexes.map((index, i) => {
                    const color = colors[i]
                    const path = shape == "step"
                        ? data.map((row, ri) => ri == 0 ? `M ${x(row.timestamp)} ${y(row.data[index])}` : `H ${x(row.timestamp)} V ${y(row.data[index])}`).join(' ')
                        : data.map((row, ri) => `${ri == 0 ? `M` : `L`} ${x(row.timestamp)} ${y(row.data[index])}`).join(' ');
                    return <g key={`line${index}`}>
                        <path d={path} fill="none" stroke={useGradient ? `url(#gradient${index})` : color} strokeWidth={strokeWidth} strokeLinejoin="round" />
                        {dot && <circle cx={x(lastRow.timestamp)} cy={y(lastRow.data[index])} r={pointRadius} fill={color} />}
                    </g>
                })}
            </g>
        </>
    )
}

function UnitTrend(props: {
    unit: string,
    horizon?: number,
    width?: number,
    height?: number,
    mini?: boolean
} & TrendProps) {
    const { dataSet, horizon, width, height, mini, gradient } = props;
    const { rows } = dataSet;
    const classes = useStyles()
    const vpw = width || 80;
    const vph = height || 15;
    const data = rows.slice(-horizon)
    const useGradient = gradient || data.length < rows.length
    return (
        <Paper className={classes.graph} square>
            <svg viewBox={`0 0 ${vpw} ${vph}`} style={{ maxHeight: mini ? "5vh" : "10vh", maxWidth: "100%" }}>
                {data.length > 1 && <UnitTrendChart data={data} useGradient={useGradient} vpw={vpw} vph={vph} {...props} />}
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
    const classes = useStyles()

    const units = unique(dataSet.units.map(unit => unit || "/"))
    return <div className={mini ? classes.mini : undefined}>
        {units.map(unit => <UnitTrend key={`graph${unit}`} unit={unit} {...props} />)}
    </div>
}