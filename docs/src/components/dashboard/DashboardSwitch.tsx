import { SwitchReg, SwitchVariant } from "../../../../src/jdom/constants";
import { useRegisterBoolValue, useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useServiceHost from "../hooks/useServiceHost";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import SwitchServiceHost from "../../../../src/hosts/switchservicehost"
import React from "react";
import { Switch } from "@material-ui/core";
import { useId } from "react-use-id-hook"
import ButtonWidget from "../widgets/ButtonWidget";
import useWidgetSize from "../widgets/useWidgetSize";

export default function DashboardSwitch(props: DashboardServiceProps) {
    const { service, services, variant } = props;

    const labelId = useId();
    const on = useRegisterBoolValue(service.register(SwitchReg.Active))
    const [switchVariant] = useRegisterUnpackedValue<[SwitchVariant]>(service.register(SwitchReg.Variant));
    const host = useServiceHost<SwitchServiceHost>(service);
    const color = host ? "secondary" : "primary";

    const handleToggle = () => host?.toggle();


    switch (switchVariant) {
        case SwitchVariant.PushButton:
            return <ButtonWidget
                checked={on}
                color={color}
                label={on ? "on" : "off"}
                onDown={host && handleToggle} />
        default:
            return <>
                <Switch aria-labelledby={labelId} color={color} checked={on} onChange={host && handleToggle} />
                <label id={labelId}>{on ? "on" : "off"}</label>
            </>
    }
}