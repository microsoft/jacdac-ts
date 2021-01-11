import { Grid } from "@material-ui/core";
import React from "react";
import { RotaryEncoderReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import { useRegisterIntValue } from "../../jacdac/useRegisterValue";
import { SvgWidget } from "../widgets/SvgWidget";
import CircleDotWidget from "../widgets/CircleDotWidget";
import useWidgetSize from "../widgets/useWidgetSize";

export default function DashboardRotaryEncoder(props: DashboardServiceProps) {
    const { service } = props;
    const position = useRegisterIntValue(service.register(RotaryEncoderReg.Position)) || 0;
    const clicksPerTurn = 12;
    const angle = position / clicksPerTurn * 360;
    const color = "primary";
    const widgetSize = useWidgetSize();

    return <Grid item>
        <CircleDotWidget angle={angle} size={widgetSize} label={"" + position} color={color} />
    </Grid>
}