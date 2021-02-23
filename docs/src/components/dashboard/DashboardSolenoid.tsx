import React from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import { SolenoidReg } from "../../../../src/jdom/constants";
import useThrottledValue from "../hooks/useThrottledValue";
import useSvgButtonProps from "../hooks/useSvgButtonProps";
import useServiceHost from "../hooks/useServiceHost";

export default function DashboardSolenoid(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);
    const pulledRegister = service.register(SolenoidReg.Pulled);
    const [pulled] = useRegisterUnpackedValue<[boolean]>(pulledRegister);
    const host = useServiceHost(service);
    const color = host ? "secondary" : "primary";
    const { active, background, controlBackground, textProps } = useWidgetTheme(color);

    const w = 128
    const bw = 84;
    const h = 72;
    const m = 6;
    const bh = h - 2 * m;
    const bsh = bh - 6 * m;

    const pos = useThrottledValue(pulled ? m : w - bw - 2 * m, w);
    const label = pulled ? "pull solenoid" : "push solenoid"

    const onToggle = (ev: React.PointerEvent) => {
        ev.preventDefault();
        host?.register(SolenoidReg.Pulled)?.setValues([!pulled ? 1 : 0]);
        pulledRegister.refresh();
    }

    const buttonProps = useSvgButtonProps<SVGRectElement>(label, !!host && onToggle)

    return <SvgWidget width={w} height={h} size={widgetSize} background={background} >
        <rect x={m + pos} y={m + (bh - bsh) / 2} width={bw} height={bsh} rx={m} ry={m} fill={active} stroke={controlBackground} />
        <rect x={m} y={m} width={bw} height={bh} rx={m} ry={m} stroke={controlBackground} fill={background} {...buttonProps} />
        <text {...textProps} x={m + bw / 2} y={m + bh / 2}>{pulled ? "pulled" : "pushed"}</text>
    </SvgWidget>
}