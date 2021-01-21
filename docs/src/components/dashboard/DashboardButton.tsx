import React from "react";
import { ButtonReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";

export default function DashboardButton(props: DashboardServiceProps) {
    const { service, services } = props;
    const [pressed] = useRegisterUnpackedValue<[boolean]>(service.register(ButtonReg.Pressed));
    const widgetSize = useWidgetSize(services.length);
    const host = useServiceHost<ButtonServiceHost>(service);
    const color = host ? "secondary" : "primary";

    const handleDown = () => host?.down();
    const handleUp = () => host?.up();
    const handleClick = () => host?.click();

    return <ButtonWidget 
            checked={!!pressed} 
            color={color} 
            size={widgetSize}
            onDown={host && handleDown}
            onUp={host && handleUp}
            onClick={host && handleClick} />
}