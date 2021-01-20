import { Grid } from "@material-ui/core";
import React from "react";
import { RotaryEncoderReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterIntValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import CircleDotWidget from "../widgets/CircleDotWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import RotaryEncoderServiceHost from "../../../../src/hosts/rotaryencoderservicehost";

export default function DashboardRotaryEncoder(props: DashboardServiceProps) {
    const { service, services } = props;
    const position = useRegisterIntValue(service.register(RotaryEncoderReg.Position)) || 0;
    const clicksPerTurn = 12;
    const angle = position / clicksPerTurn * 360;
    const widgetSize = useWidgetSize(services.length);
    const host = useServiceHost<RotaryEncoderServiceHost>(service);
    const color = host ? "secondary" : "primary";
    const handleRotate = (steps: number) => host?.rotate(steps);

    return <Grid item>
        <CircleDotWidget 
            angle={angle} 
            size={widgetSize} 
            label={"" + position} 
            color={color} 
            onRotate={host && handleRotate} />
    </Grid>
}