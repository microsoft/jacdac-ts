import React, { useContext } from "react"
import { createStyles, Grid, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_ROLE_MANAGER } from "../../../src/jdom/constants"
import useChange from "../jacdac/useChange"
import { BusState } from "../../../src/jdom/bus"
import ConnectAlert from "./ConnectAlert"
import Alert from "./Alert"
import RoleManagerService from "./RoleManagerService"
import useGridBreakpoints from "./useGridBreakpoints"

export default function RoleManager() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const services = useChange(bus, b => b.services({ serviceClass: SRV_ROLE_MANAGER }));
    const gridBreakpoints = useGridBreakpoints();

    return <>
        {<ConnectAlert serviceClass={SRV_ROLE_MANAGER} />}
        {!services.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the role manager service on the bus!</Alert>}
        <Grid container spacing={2}>
            {services.map(service => <Grid key={service.id} item {...gridBreakpoints}>
                <RoleManagerService service={service} />
            </Grid>)}
        </Grid>
    </>
}