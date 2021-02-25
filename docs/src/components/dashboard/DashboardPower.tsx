import React, { } from "react";
import { PowerReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import SvgWidget from "../widgets/SvgWidget";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import ReflectedLightServiceHost from "../../../../src/hosts/reflectedlightservicehost";
import PowerButton from "../widgets/PowerButton";

export default function DashboardPower(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const enabledRegister = service.register(PowerReg.Enabled);
    const [enabled] = useRegisterUnpackedValue<[boolean]>(enabledRegister);
    /*
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.MaxPower));
    const [] = useRegisterUnpackedValue<[boolean]>(service.register(PowerReg.Overload));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.CurrentDraw));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryVoltage))
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryCharge));
    const [] = useRegisterUnpackedValue<[number]>(service.register(PowerReg.BatteryCapacity));
    */

    const host = useServiceHost<ReflectedLightServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const widgetSize = useWidgetSize(variant, services.length)

    const w = 64
    const h = w
    const r = (h - 4) >> 1;
    const ro = r - 4
    const ri = ro - 8
    const label = enabled ? "on" : "off"

    const toggleEnabled = async () => {
        await enabledRegister.sendSetBoolAsync(!enabled);
        enabledRegister.refresh();
    }

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <PowerButton
            cx={w / 2}
            cy={h / 2}
            r={ro}
            ri={ri}
            off={!enabled}
            color={color}
            aria-label={label}
            onClick={toggleEnabled}
        />
    </SvgWidget>
}