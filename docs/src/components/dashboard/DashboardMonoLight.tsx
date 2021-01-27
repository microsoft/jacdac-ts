import React from "react";
import { ButtonReg, MonoLightReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import { SvgWidget } from "../widgets/SvgWidget";
import MonoLightServiceHost from "../../../../src/hosts/monolightservicehost";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useChange from "../../jacdac/useChange";

export default function DashboardMonoLight(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);
    const host = useServiceHost<MonoLightServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, active } = useWidgetTheme(color);

    const intensity = useChange(host, h => h?.intensity) || 0.5
    const opacity = intensity;

    const w = 64;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const sw = 2;
    const ro = r - sw;
    const ri = ro - sw;
    return <SvgWidget width={w} size={widgetSize}>
        <circle cx={cx} cy={cy} r={ro} fill={background} stroke={background} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={ri} fill={active} opacity={opacity} />
    </SvgWidget>
}