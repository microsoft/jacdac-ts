import React, { useContext, useEffect, useMemo } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useAnimationFrame from "../hooks/useAnimationFrame";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import JoystickSensorServiceHost from "../../../../src/hosts/joystickservicehost";
import { JoystickReg, scaleIntToFloat } from "../../../../src/jacdac";

export default function DashboardMonoLight(props: DashboardServiceProps) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { service, services, variant } = props;
    const widgetSize = useWidgetSize(variant, services.length);
    const host = useServiceHost<JoystickSensorServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const { active, background, controlBackground } = useWidgetTheme(color);
    const directionRegister = service.register(JoystickReg.Direction)
    const [x = 0, y = 0] = useRegisterUnpackedValue<[number, number]>(service.register(JoystickReg.Direction))

    const w = 40;
    const h = 40;
    const cx = w >> 1;
    const cy = h >> 1;
    const rp = 2
    const rc = 6
    const rj = 10
    const pw = 12
    const ph = 8

    const fx = scaleIntToFloat(x, directionRegister.fields[0].specification)
    const fy = scaleIntToFloat(y, directionRegister.fields[1].specification)

    const jx = cx + fx * rj
    const jy = cy + fy * rj
    const jw = 1

    return <SvgWidget width={w} height={h} size={widgetSize}>
        <circle className="joystick-background" cx={cx} cy={cy} r="16" fill={background}></circle>
        <rect className="dpad-up" x={"16"} y="6" width={ph} height={pw} rx={rp} fill={controlBackground}></rect>
        <rect className="dpad-down" x="16" y="22" width={ph} height={pw} rx={rp} fill={controlBackground}></rect>
        <rect className="dpad-right" x="22" y="16" width={pw} height={ph} ry={rp} fill={controlBackground}></rect>
        <rect className="dpad-left" x="6" y="16" width={pw} height={ph} ry={rp} fill={controlBackground}></rect>
        <circle className="dpad-center" cx={cx} cy={cy} r={rc} fill={controlBackground}></circle>
        <circle className="joystick-handle" cx={jx} cy={jy} r={rc} fill={background} stroke={active} strokeWidth={jw}></circle>
    </SvgWidget>
}