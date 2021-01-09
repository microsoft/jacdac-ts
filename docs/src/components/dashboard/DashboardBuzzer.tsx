
import { Grid } from "@material-ui/core";
import React from "react";
import { BuzzerCmd, BuzzerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import RegisterInput from "../RegisterInput";
import { jdpack } from "../../../../src/jdom/pack";
import CmdButton from "../CmdButton"

export default function DashboardBuzzer(props: DashboardServiceProps) {
    const { service } = props;
    const volume = service.register(BuzzerReg.Volume)

    const notes = [
        { name: "C", frequency: 261.64 },
        { name: "D", frequency: 293.68 },
        { name: "E", frequency: 329.64 },
        { name: "F", frequency: 349.24 },
        { name: "G", frequency: 392.00 },
        { name: "A", frequency: 440 },
        { name: "B", frequency: 493.92 },
    ];
    const handlePlayTone = (f: number) => async () => {
        const vol = 1;
        const period = 1000000 / f;
        const duty = period * vol / 2;
        const duration = 500;
        const data = jdpack<[number, number, number]>("u16 u16 u16", [period, duty, duration])
        await service.sendCmdAsync(BuzzerCmd.PlayTone, data)
    }

    return <>
        <Grid item>
            <RegisterInput register={volume} showRegisterName={true} />
        </Grid>
        <Grid item>
            {notes.map(note => <CmdButton size="small" variant="outlined" key={note.frequency} onClick={handlePlayTone(note.frequency)}>{note.name}</CmdButton>)}
        </Grid>
    </>
}