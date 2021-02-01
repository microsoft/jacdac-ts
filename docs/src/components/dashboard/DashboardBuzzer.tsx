
import { Button, ButtonGroup, createStyles, Grid, makeStyles } from "@material-ui/core";
import React, { useRef } from "react";
import { BuzzerCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { jdpack } from "../../../../src/jdom/pack";
import { initAudioContext } from "../../../../src/hosts/buzzerservicehost";
import useKeyboardNavigationProps from "../hooks/useKeyboardNavigationProps";

const useStyles = makeStyles(() => createStyles({
    btn: {
        minWidth: "1em",
        padding: "1em 0.75em 1em 0.75em"
    }
}));

export default function DashboardBuzzer(props: DashboardServiceProps) {
    const { service } = props;
    const classes = useStyles();
    const gridRef = useRef<HTMLDivElement>();
    const keyboardProps = useKeyboardNavigationProps(gridRef.current)

    const notes = [
        { name: "C", frequency: 261.64 },
        { name: "D", frequency: 293.68 },
        { name: "E", frequency: 329.64 },
        { name: "F", frequency: 349.24 },
        { name: "G", frequency: 392.00 },
        { name: "A", frequency: 440 },
        { name: "B", frequency: 493.92 },
    ];
    const sendPlayTone = async (f: number) => {
        initAudioContext();
        const vol = 1;
        const period = 1000000 / f;
        const duty = period * vol / 2;
        const duration = 400;
        const data = jdpack<[number, number, number]>("u16 u16 u16", [period, duty, duration])
        await service.sendCmdAsync(BuzzerCmd.PlayTone, data)
    }
    const handlePointerEnter = (f: number) => (ev: any) => {
        if (ev.buttons)
            sendPlayTone(f)
    }
    const handlePlayTone = (f: number) => () => sendPlayTone(f)

    return <Grid ref={gridRef} container alignItems="center" alignContent="space-between">
        {notes.map(note => <Grid key={note.frequency} item xs><Button
            className={classes.btn}
            size="small"
            variant="outlined"
            onPointerEnter={handlePointerEnter(note.frequency)}
            onPointerDown={handlePlayTone(note.frequency)}
            {...keyboardProps}
            >{note.name}</Button>
        </Grid>
        )}
    </Grid>
}