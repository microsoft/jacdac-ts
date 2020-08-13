import React from "react"
import { DataSet } from "./DataSet";
import { unique } from "../../../src/dom/utils";
import { Paper, makeStyles, createStyles } from "@material-ui/core";
import clsx from 'clsx';

const useStyles = makeStyles((theme) => createStyles({
    root: {
        margin: theme.spacing(1)
    },
    mini: {
        display: "inline-block",
        width: "10rem"
    }
}));

function UnitTrend(props: { dataSet: DataSet, unit: string, horizon?: number, width?: number, height?: number }) {
    const { dataSet, unit, horizon, width, height } = props;
    const { rows } = dataSet;

    if (!rows.length)
        return <></>

    const vpw = width || 80;
    const vph = height || 15;
    const indexes = dataSet.units.map((u, index) => u === unit && index).filter(index => index !== undefined)
    const data = rows.slice(-horizon)
    const times = data.map(ex => ex.timestamp)
    const maxt = Math.max.apply(null, times);
    const mint = Math.min.apply(null, times);
    const minv = Math.max.apply(null, indexes.map(i => dataSet.mins[i]));
    const maxv = Math.max.apply(null, indexes.map(i => dataSet.maxs[i]));
    const margin = 2;
    const h = (maxv - minv) || 10;
    const w = (maxt - mint) || 10;

    return <svg viewBox={`0 0 ${vpw} ${vph}`}>
        {indexes.map(index => {
            const points = data.map(row => ({ t: row.timestamp, v: row.data[index] }))
                .map(d => `${(d.t - mint) / w * vpw},${vph - (d.v - minv) / h * (vph - 2 * margin) - margin}`).join(' ');
            return <polyline points={points} fill="none" stroke="black" strokeWidth={"0.25px"} stroke-linejoin="round" />
        })}
    </svg>
}


export default function Trend(props: { dataSet: DataSet, horizon?: number, width?: number, height?: number, mini?: boolean }) {
    const { dataSet, mini } = props;
    const { rows } = dataSet;
    const classes = useStyles()

    if (!rows.length)
        return <></>

    const units = unique(dataSet.units)
    return <Paper className={clsx(classes.root, mini && classes.mini)} square>
        {units.map(unit => <UnitTrend unit={unit} {...props} />)}
    </Paper>
}