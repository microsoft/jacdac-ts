import React, { } from "react";
import { PowerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import ReflectedLightServiceHost from "../../../../src/hosts/reflectedlightservicehost";
import PowerButton from "../widgets/PowerButton";

export default function DashboardPower(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const [] = useRegisterUnpackedValue<[boolean]>(service.register(PowerReg.Enabled));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.MaxPower));
    const [] = useRegisterUnpackedValue<[boolean]>(service.register(PowerReg.Overload));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.CurrentDraw));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryVoltage))
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryCharge));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryCapacity));

    const host = useServiceHost<ReflectedLightServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const widgetSize = useWidgetSize(variant, services.length)

    const w = 128
    const h = 64

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <PowerButton cx={w / 3} cy={h >> 1} r={h / 3} />        
    </SvgWidget>
}