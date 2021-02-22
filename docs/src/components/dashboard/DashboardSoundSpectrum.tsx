import React, { useEffect, useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterBoolValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, Slider } from "@material-ui/core";
import RegisterTrend from "../RegisterTrend";
import MicIcon from '@material-ui/icons/Mic';
import { REFRESH, SoundSpectrumReg } from "../../../../src/jdom/constants";
import AnalogSensorServiceHost from "../../../../src/hosts/analogsensorservicehost";
import { useMicrophoneSpectrum } from "../hooks/useMicrophoneSpectrum";
import IconButtonWithProgress from "../ui/IconButtonWithProgress";
import { JDService } from "../../../../src/jdom/service";
import SensorServiceHost from "../../../../src/hosts/sensorservicehost";

function HostMicrophoneButton(props: { service: JDService, host?: SensorServiceHost<[Uint8Array]> }) {
    const { host, service } = props;
    const enabledRegister = service.register(SoundSpectrumReg.Enabled);
    const enabled = useRegisterBoolValue(enabledRegister)
    const [minDecibels] = useRegisterUnpackedValue<[number]>(service.register(SoundSpectrumReg.MinDecibels))
    const [maxDecibels] = useRegisterUnpackedValue<[number]>(service.register(SoundSpectrumReg.MaxDecibels))
    const [fftSize] = useRegisterUnpackedValue<[number]>(service.register(SoundSpectrumReg.FftSize));
    const [smoothingTimeConstant] = useRegisterUnpackedValue<[number]>(service.register(SoundSpectrumReg.SmoothingTimeConstant));
    const spectrum = useMicrophoneSpectrum(enabled && !!host, { fftSize, smoothingTimeConstant, minDecibels, maxDecibels });
    const title = enabled ? "Stop microphone" : "Start microphone"

    const handleClick = async () => {
        await enabledRegister.sendSetBoolAsync(!enabled, true);
    }

    // update volume on demand
    useEffect(() => host?.subscribe(REFRESH, () => {
        const v = spectrum?.();
        if (v !== undefined) {
            host.reading.setValues([v]);
        }
    }), [host, spectrum])

    return <IconButtonWithProgress
        aria-label={title}
        title={title}
        indeterminate={enabled}
        onClick={handleClick}>
        <MicIcon />
    </IconButtonWithProgress>
}

export default function DashboardSoundSpectrum(props: DashboardServiceProps) {
    const { service } = props;
    const frequencyBinsRegister = service.register(SoundSpectrumReg.FrequencyBins);
    const [frequencyBins] = useRegisterUnpackedValue<[number]>(frequencyBinsRegister);
    const host = useServiceHost<SensorServiceHost<[Uint8Array]>>(service);
    const color = host ? "secondary" : "primary";

    if (frequencyBins === undefined)
        return null;

    return <Grid container direction="column">
        <Grid item>
            <RegisterTrend register={frequencyBinsRegister} mini={true} interval={50} />
        </Grid>
        <Grid item>
            <HostMicrophoneButton service={service} host={host} />
        </Grid>
    </Grid>
}