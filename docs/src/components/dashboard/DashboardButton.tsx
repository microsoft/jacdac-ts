import { Grid } from "@material-ui/core";
import React from "react";
import { ButtonReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceView";
import ButtonWidget from "../widgets/ButtonWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";

export default function DashboardButton(props: DashboardServiceProps) {
    const { service } = props;
    const pressedRegister = service.register(ButtonReg.Pressed);
    const [pressed] = useRegisterUnpackedValue<[boolean]>(pressedRegister);
    const widgetSize = useWidgetSize();
    const host = useServiceHost<ButtonServiceHost>(service);

    const handleDown = () => host?.down();
    const handleUp = () => host?.up();
    const handleClick = () => host?.click();

    return <Grid item>
        <ButtonWidget checked={!!pressed} color={"primary"} size={widgetSize}
            onDown={host && handleDown}
            onUp={host && handleUp}
            onClick={host && handleClick} />
    </Grid>
}