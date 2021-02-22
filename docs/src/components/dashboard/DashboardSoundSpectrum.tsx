import React, { useEffect, useRef, useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterBoolValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, Slider } from "@material-ui/core";
import RegisterTrend from "../RegisterTrend";
import MicIcon from '@material-ui/icons/Mic';
import { CHANGE, REFRESH, SoundSpectrumReg } from "../../../../src/jdom/constants";
import AnalogSensorServiceHost from "../../../../src/hosts/analogsensorservicehost";
import { useMicrophoneSpectrum } from "../hooks/useMicrophoneSpectrum";
import IconButtonWithProgress from "../ui/IconButtonWithProgress";
import { JDService } from "../../../../src/jdom/service";
import SensorServiceHost from "../../../../src/hosts/sensorservicehost";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useWidgetTheme from "../widgets/useWidgetTheme";

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
    const { service, variant, services } = props;
    const frequencyBinsRegister = service.register(SoundSpectrumReg.FrequencyBins);
    const host = useServiceHost<SensorServiceHost<[Uint8Array]>>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color)
    const widgetSize = useWidgetSize(variant, services.length)
    const pathRef = useRef<SVGPathElement>();

    const w = 128;
    const h = w / 1.612;
    const m = 2;
    const dy = (h - 2 * m) / 0xff;

    useEffect(() => frequencyBinsRegister.subscribe(CHANGE, () => {
        // render outside of react loop
        const { current } = pathRef;
        const bins = frequencyBinsRegister.data;
        if (!current || !bins) return;

        const dx = (w - 2 * m) / bins.length;
        const dw = (w - 2 * m) / (bins.length * 6)
        let d = `M ${m} ${h - m} `;
        for (let i = 0; i < bins.length; ++i) {
            const bin = bins[i];
            d += ` v ${-dy * bin} h ${dx - dw} v ${dy * bin} h ${dw}`;
        }
        d += ' z';
        current.setAttribute("d", d);
    }), [frequencyBinsRegister])

    return <Grid container direction="column">
        <Grid item>
            <SvgWidget width={w} height={h} size={widgetSize} background={background}>
                <path fill={active} ref={pathRef} />
            </SvgWidget>
        </Grid>
        <Grid item>
            <HostMicrophoneButton service={service} host={host} />
        </Grid>
    </Grid>
}