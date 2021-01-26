
import React, {  } from "react";
import { RealTimeClockReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { RealTimeClockReadingType } from "../../../../src/hosts/realtimeclockservicehost";
import { Typography } from "@material-ui/core";

export default function DashboardRealTimeClock(props: DashboardServiceProps) {
    const { service } = props;

    const [epoch] = useRegisterUnpackedValue<RealTimeClockReadingType>(service.register(RealTimeClockReg.Now));
    if (epoch === undefined)
        return null;
    const time = new Date(epoch * 1000);
    return <Typography tabIndex={0} role="timer" aria-label={`clock at ${time.toLocaleString()}`} variant="body1">{time.toLocaleString()}</Typography>
}