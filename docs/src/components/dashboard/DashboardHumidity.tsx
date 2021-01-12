import { Grid } from "@material-ui/core";
import React from "react";
import { HumidityReg } from "../../../../src/jdom/constants";
import ButtonServiceHost from "../../../../src/hosts/buttonservicehost";
import { DashboardServiceProps } from "./DashboardServiceView";
import PercentWidget from "../widgets/PercentWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useWidgetSize from "../widgets/useWidgetSize";
import useServiceHost from "../hooks/useServiceHost";
import RegisterInput from "../RegisterInput";

export default function DashboardHumidity(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const register = service.register(HumidityReg.Humidity);
    const [humidity] = useRegisterUnpackedValue<[number]>(register);
    const widgetSize = useWidgetSize();
    const host = useServiceHost<ButtonServiceHost>(service);
    const color = host ? "secondary" : undefined;

    return <>
        <Grid item>
            <PercentWidget
                value={humidity}
                label="Rh"
                color={color}
                size={widgetSize} />
        </Grid>
        {expanded && <Grid item xs={12}>
            <RegisterInput 
                key={register.id}
                register={register}
                showServiceName={false}
                showRegisterName={expanded}
                hideMissingValues={!expanded}
                showTrend={true}
            />
        </Grid>}
    </>
}