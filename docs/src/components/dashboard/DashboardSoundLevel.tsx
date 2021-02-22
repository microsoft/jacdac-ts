import React, { useEffect, useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, Slider } from "@material-ui/core";
import RegisterTrend from "../RegisterTrend";
import MicIcon from '@material-ui/icons/Mic';
import { REFRESH, SoundLevelReg } from "../../../../src/jdom/constants";
import AnalogSensorServiceHost from "../../../../src/hosts/analogsensorservicehost";
import { useMicrophoneVolume } from "../hooks/useAudioAnalyzer";
import IconButtonWithProgress from "../ui/IconButtonWithProgress";

function HostMicrophoneButton(props: { host: AnalogSensorServiceHost }) {
    const { host } = props;
    const [enabled, setEnabled] = useState(false);
    const volume = useMicrophoneVolume(enabled);
    const title = enabled ? "Stop Microphone" : "Start microphone"

    const handleClick = () => setEnabled(!enabled);

    // update volume on demand
    useEffect(() => host.subscribe(REFRESH, () => {
        const v = volume?.();
        if (v !== undefined) {
            console.log("volume", { v })
            host.reading.setValues([v]);
        }
    }), [host, volume])

    return <IconButtonWithProgress
        aria-label={title}
        title={title}
        indeterminate={enabled}
        onClick={handleClick}
    >
        <MicIcon />
    </IconButtonWithProgress>
}

export default function DashboardSoundLevel(props: DashboardServiceProps) {
    const { service } = props;
    const soundLevelRegister = service.register(SoundLevelReg.SoundLevel);
    const [soundLevel] = useRegisterUnpackedValue<[number]>(soundLevelRegister);
    const host = useServiceHost<AnalogSensorServiceHost>(service);
    const color = host ? "secondary" : "primary";

    const onChange = (event: unknown, newValue: number | number[]): void => {
        const svalue = newValue as number;
        host?.reading.setValues([svalue]);
        soundLevelRegister.sendGetAsync(); // refresh
    }

    if (soundLevel === undefined)
        return null;

    return <Grid container direction="column">
        <Grid item>
            <RegisterTrend register={soundLevelRegister} mini={true} interval={50} />
        </Grid>
        {host && <Grid item>
            <Grid container spacing={2}>
                <Grid item>
                    <HostMicrophoneButton host={host} />
                </Grid>
                <Grid item xs>
                    <Slider
                        valueLabelDisplay="off"
                        min={0} max={1} step={0.1}
                        value={soundLevel}
                        onChange={onChange}
                        color={color}
                    />
                </Grid>
            </Grid>
        </Grid>}
    </Grid>
}