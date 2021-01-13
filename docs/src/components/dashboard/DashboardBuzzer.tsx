
import { Button, ButtonGroup, createStyles, makeStyles } from "@material-ui/core";
import React from "react";
import { BuzzerCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { jdpack } from "../../../../src/jdom/pack";

const useStyles = makeStyles(() => createStyles({
    btn: {
        minWidth: "1em",
        padding: "2em 0.75em 2em 0.75em"
    }
}));

export default function DashboardBuzzer(props: DashboardServiceProps) {
    const { service } = props;
    const classes = useStyles();

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

    return <ButtonGroup>
        {notes.map(note => <Button
            key={note.frequency}
            className={classes.btn}
            size="small"
            variant="outlined"
            onPointerEnter={handlePointerEnter(note.frequency)}
            onClick={handlePlayTone(note.frequency)}>{note.name}</Button>
        )}
    </ButtonGroup>
}