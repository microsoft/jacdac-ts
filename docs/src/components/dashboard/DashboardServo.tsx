
import React, { } from "react";
import { ServoReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterBoolValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import { JDService } from "../../../../src/jacdac";
import useThrottledValue from "../hooks/useThrottledValue";
import { SG90_RESPONSE_SPEED } from "../../../../src/hosts/hosts";
import { Grid } from "@material-ui/core";
import ServoServiceHost from "../../../../src/hosts/servoservicehost";
import RegisterInput from "../RegisterInput";
import PowerButton from "../widgets/PowerButton";

function useActualAngle(service: JDService) {
    const [angle] = useRegisterUnpackedValue<[number]>(service.register(ServoReg.Angle));
    // sec/60deg
    const [responseSpeed] = useRegisterUnpackedValue<[number]>(service.register(ServoReg.ResponseSpeed));
    const rotationalSpeed = 60 / (responseSpeed || SG90_RESPONSE_SPEED);
    const actualAngle = useThrottledValue(angle || 0, rotationalSpeed)

    return actualAngle;
}

export default function DashboardServo(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const enabledRegister = service.register(ServoReg.Enabled);
    const [enabled] = useRegisterUnpackedValue<[boolean]>(enabledRegister)
    const off = !enabled;
    const angleRegister = service.register(ServoReg.Angle);
    const angle = useActualAngle(service)
    const [offset] = useRegisterUnpackedValue<[number]>(service.register(ServoReg.Offset));

    const host = useServiceHost<ServoServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color)
    const widgetSize = useWidgetSize(variant, services.length)

    const cx = 78;
    const cy = 55;

    const a = enabled ? (angle + (offset || 0)) : 0;
    const transform = `rotate(${- a}, ${cx}, ${cy})`;
    const h = 111.406;
    const w = 158.50195;
    const pr = 16;
    const pri = 8;
    const text = enabled ? `${Math.round(a)}°` : 'off';

    const toggleOff = () => enabledRegister.sendSetBoolAsync(off, true);

    return <Grid container alignContent="center">
        <Grid item xs={12}>
            <SvgWidget tabIndex={0} title={`servo at angle ${angle}`} width={w} height={h} size={widgetSize}>
                <path fill={background} d="M158.502 10.687H0v89.75h158.502z" />
                <path fill={controlBackground} d="M125.545 55.641c0-24.994-20.26-45.256-45.254-45.256-17.882.016-34.077 9.446-41.328 25.79-2.655.024-4.192.076-6.35.07-11.158 0-20.204 9.046-20.204 20.204 0 11.158 9.046 20.203 20.203 20.203 2.389-.005 4.354-.332 6.997-.256 7.56 15.59 23.356 24.485 40.682 24.5 24.992 0 45.254-20.264 45.254-45.256z" />
                <path fill={enabled ? active : background} stroke={active} transform={transform} d="M93.782 55.623c-.032-3.809-.19-6.403-.352-7.023h-.002c-.93-3.558-6.621-6.73-14.793-6.73-8.17 0-14.649 3.016-14.795 6.73-.25 6.419-4.049 62.795 13.561 62.806 14.308.008 16.52-39.277 16.38-55.783zm-8.05.08a7.178 7.178 0 010 .012 7.178 7.178 0 01-7.179 7.176 7.178 7.178 0 01-7.177-7.176 7.178 7.178 0 017.177-7.178 7.178 7.178 0 017.178 7.166z" />
                <text x={w / 2} y={30} textAnchor="middle" fill={textPrimary}>{text}</text>
                <PowerButton r={pr} ri={pri} cx={w - pr - 2} cy={pr + 12}
                    color={color}
                    strokeWidth={1.5}
                    off={off} onClick={host && toggleOff} />
            </SvgWidget>
        </Grid>
        <Grid item xs={12}>
            <RegisterInput register={angleRegister} />
        </Grid>
    </Grid>
}