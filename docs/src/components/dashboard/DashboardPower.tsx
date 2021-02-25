import React, { } from "react";
import { PowerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import SvgWidget from "../widgets/SvgWidget";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import ReflectedLightServiceHost from "../../../../src/hosts/reflectedlightservicehost";
import PowerButton from "../widgets/PowerButton";
import { Grid, Typography } from "@material-ui/core";
import useWidgetTheme from "../widgets/useWidgetTheme";

function DataWidget(props: { value: number, name: string, unit: string }) {
    const { value, name, unit } = props;
    if (value === undefined || isNaN(value))
        return null;
    const svalue = value === undefined ? "--" : value.toString();
    return <Grid item>
        <Typography variant="caption">{`${name}: ${svalue} ${unit}`}</Typography>
    </Grid>
}

export default function DashboardPower(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const enabledRegister = service.register(PowerReg.Enabled);
    const [enabled] = useRegisterUnpackedValue<[boolean]>(enabledRegister);
    const [overload] = useRegisterUnpackedValue<[boolean]>(service.register(PowerReg.Overload));
    const [batteryCharge] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryCharge));
    
    const host = useServiceHost<ReflectedLightServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textProps } = useWidgetTheme(color);

    const w = 64
    const h = w
    const r = (h - 4) >> 1;
    const ro = r - 4
    const ri = ro - 8
    const label = overload ? "overload" : enabled ? "on" : "off"

    const mw = 2
    const bw = 12
    const hw = 4
    const rw = mw / 2

    const toggleEnabled = async () => {
        await enabledRegister.sendSetBoolAsync(!enabled);
        enabledRegister.refresh();
    }

    return <SvgWidget width={w} height={h}>
        <g>
            <PowerButton
                cx={w / 2}
                cy={h / 2}
                r={ro}
                ri={ri}
                off={!enabled}
                color={color}
                aria-label={label}
                borderStroke={!!overload && "red"}
                onClick={toggleEnabled}
            />
            {batteryCharge !== undefined && <g>
                <title>{`battery charge ${Math.floor(batteryCharge * 100)}%`}</title>
                <rect x={w - bw - mw} y={mw} width={bw * batteryCharge} height={hw} rx={rw} ry={rw} fill={active} />
                <rect x={w - bw - mw} y={mw} width={bw} height={hw} rx={rw} ry={rw} fill={"none"} stroke={background} strokeWidth={1} />
                <text x={w - 2 * mw} y={mw + hw / 2} {...textProps} textAnchor="end" fontSize={hw * 0.6}>{Math.floor(batteryCharge * 100)}%</text>
            </g>}
        </g>
    </SvgWidget>
}