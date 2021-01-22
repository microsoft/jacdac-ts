import React from "react";
import { RotaryEncoderReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterIntValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import RotaryEncoderServiceHost from "../../../../src/hosts/rotaryencoderservicehost";
import useWidgetTheme from "../widgets/useWidgetTheme";

export default function DashboardRotaryEncoder(props: DashboardServiceProps) {
    const { service, services } = props;
    const position = useRegisterIntValue(service.register(RotaryEncoderReg.Position)) || 0;
    const clicksPerTurn = 12;
    const angle = position / clicksPerTurn * 360;
    const widgetSize = useWidgetSize(services.length);
    const host = useServiceHost<RotaryEncoderServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color);
    const label = "" + position;

    const w = 37.794
    const r = 0.06;
    const fs = Math.max(0.2, 0.5 - label.length * 0.1)
    return <SvgWidget width={w} height={w} size={widgetSize} viewBox={"0 0 1 1"}>
        <path fill={background} d="M.67.029a.037.037 0 01-.072-.02A.5.5 0 00.538 0a.037.037 0 01-.075 0 .5.5 0 00-.061.008.038.038 0 01-.073.02.5.5 0 00-.056.025.037.037 0 01-.064.04A.5.5 0 00.16.13.037.037 0 01.11.186a.5.5 0 00-.035.05.037.037 0 01-.035.066.5.5 0 00-.02.058.037.037 0 01-.016.074A.5.5 0 000 .495.037.037 0 01.005.57a.5.5 0 00.013.06.038.038 0 01.025.07.5.5 0 00.028.056.037.037 0 01.043.06.5.5 0 00.042.046.037.037 0 01.058.047.5.5 0 00.053.032.037.037 0 01.069.03.5.5 0 00.059.016.037.037 0 01.074.01.5.5 0 00.062 0 .037.037 0 01.074-.01.5.5 0 00.06-.016.037.037 0 01.068-.03.5.5 0 00.053-.032.037.037 0 01.058-.047.5.5 0 00.042-.045.037.037 0 01.043-.061A.5.5 0 00.957.7.037.037 0 01.982.63.5.5 0 00.995.57.037.037 0 011 .495.5.5 0 00.996.434.038.038 0 01.98.36.5.5 0 00.96.302.037.037 0 01.925.236.5.5 0 00.89.186.037.037 0 01.839.13.5.5 0 00.79.092.037.037 0 01.727.053.5.5 0 00.671.03z"
            />
        <path fill={controlBackground} d="M.1.499a.4.4 0 10.8 0 .4.4 0 10-.8 0z" />
        <text letterSpacing={0} x={0.5} y={0.5} fontSize={fs} textAnchor="middle" fill={textPrimary} alignmentBaseline="central" dominantBaseline="middle">{label}</text>
        <circle
            transform={`rotate(${angle}, 0.5, 0.5)`}
            cx={0.5} cy={0.19} r={r}
            fill={active} />
    </SvgWidget>
}