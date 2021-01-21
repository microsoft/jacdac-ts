
import React, { useEffect, useState } from "react";
import { ServoReg, TrafficLightReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterBoolValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import { JDService } from "../../../../src/jacdac";
import useThrottledValue from "../hooks/useThrottledValue";

export default function DashboardTrafficLight(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const [red] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Red))
    const [orange] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Orange))
    const [green] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Green))

    const lights = [red, orange, green]

    const host = useServiceHost(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color)
    const widgetSize = useWidgetSize(variant, services.length)

    const m = 2;
    const r = 8;
    const ri = 7;
    const w = 2 * r + 2 * m;
    const h = 6 * w + 4 * m;
    const cx = w / 2;
    let cy = 0;
    const names = [
        "red",
        "yellow",
        "green"
    ]
    const colors = [
        "red",
        "orange",
        "green"
    ]

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <>
            <rect x={0} y={0} width={w} height={h} rx={m} fill={background} />
            {lights.map((v, i) => {
                cy += m + 2 * r;
                const fill = v ? colors[i] : controlBackground;
                return <g key={i}>
                    <title>{`${names[i]} ${v ? "on" : "off"}`}</title>
                    <circle cx={cx} cy={cy} r={r} fill={background} stroke={"none"} />
                    <circle cx={cx} cy={cy} r={ri} fill={fill} stroke={"none"} />
                </g>;
            })}
        </>
    </SvgWidget>;
}