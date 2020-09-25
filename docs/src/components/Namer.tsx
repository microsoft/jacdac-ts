import React, { useContext } from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_DEVICE_NAMER } from "../../../src/dom/constants"
import useChange from "../jacdac/useChange"
import { BusState } from "../../../src/dom/bus"
import ConnectAlert from "./ConnectAlert"
import Alert from "./Alert"
import { DeviceNamerService } from "./DeviceNamerService"

export default function Namer() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const services = useChange(bus, () => bus.services({ serviceClass: SRV_DEVICE_NAMER }));

    return <>
        {<ConnectAlert serviceClass={SRV_DEVICE_NAMER} />}
        {!services.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the device namer service on the bus!</Alert>}
        {services.map(service => <DeviceNamerService key={service.id} service={service} />)}
    </>
}