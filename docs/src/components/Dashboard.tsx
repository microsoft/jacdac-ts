import { Grid } from "@material-ui/core";
import React, { useContext } from "react";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useChange from "../jacdac/useChange";
import DeviceCard from "./DeviceCard";
import useGridBreakpoints from "./useGridBreakpoints";

export default function Dashboard() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, b => b.devices());
    const gridBreakpoints = useGridBreakpoints(devices?.length)

    return <Grid container spacing={2}>
        {devices?.map(device => <Grid key={device.id} item {...gridBreakpoints}>
            <DeviceCard device={device} />
        </Grid>)}
    </Grid>
}