import React, { useContext } from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_ROLE_MANAGER } from "../../../src/dom/constants"
import useChange from "../jacdac/useChange"
import { BusState } from "../../../src/dom/bus"
import ConnectAlert from "./ConnectAlert"
import Alert from "./Alert"
import { RoleManagerService } from "./RoleManagerService"

export default function RoleManager() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const services = useChange(bus, () => bus.services({ serviceClass: SRV_ROLE_MANAGER }));

    return <>
        {<ConnectAlert serviceClass={SRV_ROLE_MANAGER} />}
        {!services.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the role manager service on the bus!</Alert>}
        {services.map(service => <RoleManagerService key={service.id} service={service} />)}
    </>
}