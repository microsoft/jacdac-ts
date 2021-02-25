import React from "react";
import { ButtonReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";

export default function DashboardButton(props: DashboardServiceProps) {
    const { service, services, variant } = props;
    const pressedRegister = service.register(ButtonReg.Pressed);
    const [pressed] = useRegisterUnpackedValue<[boolean]>(pressedRegister);
    const widgetSize = "5em";
    const host = useServiceHost<ButtonServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const label = `button ${pressed ? `down` : `up`}`
    const handleDown = () => host?.down();
    const handleUp = () => host?.up();

    return <ButtonWidget
        checked={!!pressed}
        color={color}
        size={widgetSize}
        onDown={host && handleDown}
        onUp={host && handleUp}
        label={label}
    />
}