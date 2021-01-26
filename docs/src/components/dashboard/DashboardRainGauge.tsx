
import React, { useEffect, useState } from "react";
import { CHANGE, RainGaugeReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import useThrottledValue from "../hooks/useThrottledValue";
import RainGaugeServiceHost from "../../../../src/hosts/RainGaugeServiceHost"
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { roundWithPrecision } from "../../../../src/jacdac";
import { useId } from "react-use-id-hook";

const TILT = 15;

export default function DashbaordRainGauge(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const [precipitation] = useRegisterUnpackedValue<[number]>(service.register(RainGaugeReg.Precipitation))
    const clipId = useId();
    const host = useServiceHost<RainGaugeServiceHost>(service)
    const tiltCount = useChange(host, h => h?.tiltCount);
    const level = useChange(host, h => h?.level);
    const tiltAngle = tiltCount !== undefined ? (tiltCount % 2 ? -TILT : TILT) : 0;
    const color = host ? "secondary" : "primary";
    const { background, controlBackground, active, textPrimary } = useWidgetTheme(color)
    const widgetSize = useWidgetSize(variant, services.length)
    const a = useThrottledValue(tiltAngle, 45)
    const l = useThrottledValue(level !== undefined ? level : 0.5, 1);
    const clickeable = !!host;

    const w = 128;
    const h = 64;
    const bw = w / 2;
    const bh = h / 3;
    const bx = (w - bw) / 2;
    const by = h - bh - 24;
    const sw = 1;
    const ty = h - 4;
    const fs = 8;

    const handleClick = async () => await host?.rain(0.25);

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <defs>
            <clipPath id={clipId}>
                <rect transform={`rotate(${-a}, ${w / 2}, ${by + bh})`}
                    x={0} y={by + bh * (1 - l)}
                    width={w}
                    height={h} />
            </clipPath>
        </defs>
        <g transform={`rotate(${a}, ${w / 2}, ${by + bh})`}>
            <rect x={bx} y={by}
                width={bw}
                height={bh}
                strokeWidth={sw}
                stroke={active}
                fill={background}
                aria-label={"bucket"}
                onClick={host && handleClick}
                className={clickeable ? "clickeable" : undefined}
                role={clickeable ? "button" : undefined}
            />
            <rect x={bx} y={by}
                width={bw}
                height={bh}
                stroke={active}
                fill={active}
                aria-label={"water"}
                clipPath={`url(#${clipId})`}
                style={{ userSelect: "none" }}
            />
        </g>
        <text x={w / 2} y={ty} fontSize={fs} textAnchor="middle" fill={textPrimary}>
            {roundWithPrecision(precipitation || 0, 1)}mm
        </text>
    </SvgWidget>;
}