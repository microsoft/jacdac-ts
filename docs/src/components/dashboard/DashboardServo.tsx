
import React from "react";
import { ServoReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterBoolValue, useRegisterIntValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";

export default function DashboardServo(props: DashboardServiceProps) {
    const { service } = props;

    const enabled = useRegisterBoolValue(service.register(ServoReg.Enabled))
    const register = service.register(ServoReg.Pulse);
    const value = useRegisterIntValue(register);
    const host = useServiceHost(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color)
    const widgetSize = useWidgetSize()

    const cx = 55.5;
    const cy = 79.8;

    const angle = enabled ? 90 + (value - 2500) / (2000) * 180 : 0;
    const transform = `rotate(${90 - angle}, ${cx}, ${cy})`;
    const w = 111.406;
    const h = 158.50195;
    const text = enabled ? `${Math.round(angle)}°` : 'off';

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <path fill={background} d="M10.687 0v158.502h89.75V0z" />
        <path fill={controlBackground} d="M55.641 32.957c-24.994 0-45.256 20.26-45.256 45.254.016 17.882 9.446 34.077 25.79 41.328.024 2.655.076 4.192.07 6.35 0 11.158 9.046 20.204 20.204 20.204 11.158 0 20.203-9.046 20.203-20.203-.005-2.389-.332-4.354-.256-6.997 15.59-7.56 24.485-23.356 24.5-40.682 0-24.992-20.264-45.254-45.256-45.254z" />
        <path fill={enabled ? active : background} stroke={active} transform={transform} d="M55.623 64.72c-3.809.032-6.403.19-7.023.352v.002c-3.558.93-6.73 6.621-6.73 14.793 0 8.17 3.016 14.649 6.73 14.795 6.419.25 62.795 4.049 62.806-13.561.008-14.308-39.277-16.52-55.783-16.38zm.08 8.05a7.178 7.178 0 01.012 0 7.178 7.178 0 017.176 7.179 7.178 7.178 0 01-7.176 7.177 7.178 7.178 0 01-7.178-7.177 7.178 7.178 0 017.166-7.178z" />
        <text x={w / 2} y={20} textAnchor="middle" fill={textPrimary}>{text}</text>
    </SvgWidget>;
}