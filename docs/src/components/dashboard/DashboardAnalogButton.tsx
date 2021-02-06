import React, { useState } from "react";
import { AnalogButtonReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import SvgWidget from "../widgets/SvgWidget";
import useSvgButtonProps from "../hooks/useSvgButtonProps";
import useWidgetTheme from "../widgets/useWidgetTheme";
import { describeArc } from "../widgets/svgutils";
import AnalogSensorServiceHost from "../../../../src/hosts/analogsensorservicehost";
import useAnimationFrame from "../hooks/useAnimationFrame";

const ACTIVE_SPEED = 0.05
const INACTIVE_SPEED = 0.1

export default function DashboardAnalogButton(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const pressureRegister = service.register(AnalogButtonReg.Pressure);
    const [pressure] = useRegisterUnpackedValue<[number]>(pressureRegister)
    const [activeThreshold] = useRegisterUnpackedValue<[number]>(service.register(AnalogButtonReg.ActiveThreshold))
    const widgetSize = useWidgetSize(variant, services.length);
    const host = useServiceHost<AnalogSensorServiceHost>(service);
    const [down, setDown] = useState(false)
    const color = host ? "secondary" : "primary";
    const label = `button pressure ${pressure}`
    const { background, controlBackground, active } = useWidgetTheme(color);
    const handleDown = () => {
        setDown(true)
    }
    const handleUp = () => {
        setDown(false)
    }
    const buttonProps = useSvgButtonProps<SVGCircleElement>(label, host && handleDown, host && handleUp)

    useAnimationFrame(() => {
        if (!host) return false;
        const [p] = host.reading.values();
        let keepAnimating = true;
        if (down) {
            if (p > 1 - ACTIVE_SPEED) {
                host.reading.setValues([1]);
                keepAnimating = false;
            } else
                host.reading.setValues([p + ACTIVE_SPEED]);
        } else {
            if (p < INACTIVE_SPEED) {
                host.reading.setValues([0]);
                keepAnimating = false;
            } else
                host.reading.setValues([p - INACTIVE_SPEED]);
        }
        host.reading.sendGetAsync(); // refresh ui
        return keepAnimating;
    }, [down])

    if (pressure === undefined)
        return null;

    const buttonActive = pressure > activeThreshold;
    const w = 64;
    const mo = down ? 3 : 5;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const rp = r - mo;
    const ri = rp - mo;
    const ps = mo;

    const range = 360;
    const a = pressure * range;
    const d = describeArc(cx, cy, rp, 0, a)

    return <SvgWidget width={w} size={widgetSize}>
        <rect x={0} y={0} rx={2} ry={2} width={w} height={w} fill={background} />
        {pressure && <path d={d} stroke={active} strokeLinecap={"round"} strokeWidth={ps} />}
        <circle cx={cx} cy={mo} r={mo / 3} 
            aria-label={`active threshold ${activeThreshold}`}
            fill={controlBackground} transform={`rotate(${range * activeThreshold}, ${cx}, ${cy})`} />
        <circle cx={cx} cy={cy} r={ri}
            aria-live="polite"
            fill={buttonActive ? active : controlBackground}
            {...buttonProps}
        />
    </SvgWidget>
}