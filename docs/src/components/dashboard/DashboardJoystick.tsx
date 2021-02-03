import React, { useRef, useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import SvgWidget from "../widgets/SvgWidget";
import useWidgetTheme from "../widgets/useWidgetTheme";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useAnimationFrame from "../hooks/useAnimationFrame";
import JoystickSensorServiceHost from "../../../../src/hosts/joystickservicehost";
import { JoystickReg } from "../../../../src/jacdac";
import { CSSProperties } from "@material-ui/core/styles/withStyles";
import JoystickWidget from "../widgets/JoystickWidget";

export default function DashboardJoystick(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const register = service.register(JoystickReg.Direction)
    const [x, y] = useRegisterUnpackedValue<[number, number]>(register)
    const host = useServiceHost<JoystickSensorServiceHost>(service);
    const widgetSize = useWidgetSize(variant, services.length)
    const color = host ? "secondary" : "primary";

    const values = () => host.reading.values();
    const onUpdate = (newx: number, newy: number) => {
        host.reading.setValues([newx, newy]);
        register.refresh();
    }

    return <JoystickWidget x={x} y={y}
        color={color}
        widgetSize={widgetSize}
        onUpdate={onUpdate}
        hostValues={host && values} />
}
