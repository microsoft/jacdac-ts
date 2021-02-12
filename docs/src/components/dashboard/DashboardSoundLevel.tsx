import React from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, Slider } from "@material-ui/core";
import RegisterTrend from "../RegisterTrend";
import { useId } from "react-use-id-hook"
import SoundLevelServiceHost from "../../../../src/hosts/soundlevelservicehost"
import MicIcon from '@material-ui/icons/Mic';
import { SoundLevelReg } from "../../../../src/jdom/constants";

export default function DashboardSoundLevel(props: DashboardServiceProps) {
    const { service } = props;
    const soundLevelRegister = service.register(SoundLevelReg.SoundLevel);
    const [soundLevel] = useRegisterUnpackedValue<[number]>(soundLevelRegister);
    const host = useServiceHost<SoundLevelServiceHost>(service);
    const color = host ? "secondary" : "primary";

    const onChange = (event: unknown, newValue: number | number[]): void => {
        const svalue = newValue as number;
        host?.setSoundLevel(svalue);
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
                    <MicIcon />
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