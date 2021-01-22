
import React, { } from "react";
import { TrafficLightReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useServiceHost from "../hooks/useServiceHost";
import useWidgetSize from "../widgets/useWidgetSize";
import useSvgButtonProps from "../hooks/useSvgButtonProps";
import TrafficLightServiceHost from "../../../../src/hosts/trafficlightservicehost";

const m = 2;
const r = 8;
const ri = 7;
const w = 2 * r + 2 * m;
const h = 6 * w + 4 * m;
const cx = w / 2;

function TrafficLight(props: { cx: number, cy: number, label: string, background: string, fill: string, onDown?: () => void }) {
    const { cx, cy, fill, background, label, onDown } = props;
    const buttonProps = useSvgButtonProps<SVGCircleElement>(label, onDown);

    return <g>
        <circle cx={cx} cy={cy} r={r} fill={background} stroke={"none"} />
        <circle cx={cx} cy={cy} r={ri} fill={fill} {...buttonProps} />
    </g>;
}

export default function DashboardTrafficLight(props: DashboardServiceProps) {
    const { service, services } = props;

    const [red] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Red))
    const [orange] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Orange))
    const [green] = useRegisterUnpackedValue<[boolean]>(service.register(TrafficLightReg.Green))

    const lightRegs = [TrafficLightReg.Red, TrafficLightReg.Orange, TrafficLightReg.Green]
    const lights = [red, orange, green]

    const host = useServiceHost<TrafficLightServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { background, controlBackground } = useWidgetTheme(color)
    const widgetSize = useWidgetSize(services.length)

    let cy = 0;
    const names = [
        "red",
        "orange",
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
                const onDown = () => host?.register(lightRegs[i]).setValues([!v]);
                return <TrafficLight
                    key={i} cx={cx} cy={cy}
                    background={background}
                    fill={fill}
                    onDown={host && onDown}
                    label={`${names[i]} ${v ? "on" : "off"}`} />
            })}
        </>
    </SvgWidget>;
}