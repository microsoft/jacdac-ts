import React, { useContext } from "react"
import { Grid } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_SETTINGS_STORAGE } from "../../../src/jdom/constants"
import useChange from "../jacdac/useChange"
import { BusState } from "../../../src/jdom/bus"
import ConnectAlert from "./ConnectAlert"
import Alert from "./Alert"

export default function SettingsManager() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const services = useChange(bus, b => b.services({ serviceClass: SRV_SETTINGS_STORAGE }));

    return <>
        {<ConnectAlert serviceClass={SRV_SETTINGS_STORAGE} />}
        {!services.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the settings storage service on the bus!</Alert>}
        <Grid container spacing={2}>
            {services.map(service => <Grid key={service.id} item xs={12}>
            </Grid>)}
        </Grid>
    </>
}