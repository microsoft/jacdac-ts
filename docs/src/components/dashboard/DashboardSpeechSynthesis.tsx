import React, { useState } from "react";
import { SpeechSynthesisCmd, SpeechSynthesisReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { Grid, TextField } from "@material-ui/core";
import VoiceChatIcon from '@material-ui/icons/VoiceChat';
import CmdButton from "../CmdButton";
import { jdpack } from "../../../../src/jacdac";


export default function DashboardSpeechSynthesis(props: DashboardServiceProps) {
    const { service } = props;
    const enabled = service.register(SpeechSynthesisReg.Enabled);
    const [text, setText] = useState("jacdac")

    const handleChange = (ev) => {
        const newValue = ev.target.value
        setText(newValue)
    }

    const handleSpeak = async () => {
        console.log(`speak ${text}`)
        if (!enabled.boolValue)
            await enabled.sendSetAsync(jdpack<[boolean]>("u8", [true]), true);
        await service.sendCmdAsync(SpeechSynthesisCmd.Speak, jdpack<[string]>("s", [text]));
    }

    return <>
        <Grid item xs={12}>
            <TextField
                disabled={!text}
                spellCheck={false}
                value={text}
                label={"speech synthesis"}
                helperText={"Enter text to speak out"}
                onChange={handleChange}
                type={"text"}
            />
            <CmdButton
                title="speak text"
                onClick={handleSpeak}
                icon={<VoiceChatIcon />} />
        </Grid>
    </>
}