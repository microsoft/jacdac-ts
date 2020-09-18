import React, { useContext, useEffect, useState } from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_DEVICE_NAMER } from "../../../src/dom/constants"
import useChange from "../jacdac/useChange"
import { JDDevice } from "../../../src/dom/device"
import DeviceName from "./DeviceName"
import { BusState } from "../../../src/dom/bus"
import ConnectAlert from "./ConnectAlert"
import { Alert } from "@material-ui/lab"
import { JDService } from "../../../src/dom/service"
import { DeviceNamerClient } from "../../../src/dom/namer"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    }
}))

function DeviceNameView(props: { service: JDService }) {
    const { service } = props
    const [client, setClient] = useState<DeviceNamerClient>(undefined)

    console.log(client)
    useChange(client)
    useEffect(() => {
        console.log(`creating client`)
        const c = new DeviceNamerClient(service)
        setClient(c)
        return () => c.unmount()
    }, [service])

    if (!client)
        return <></> // wait till loaded

    return <div>
        <h2>
            <DeviceName device={service.device} />
        </h2>
        <div>
            {client?.remoteRequestedDevices.map(rdev => <div>{rdev.name}</div>)}
        </div>
    </div>
}

export default function Namer(props: {}) {
    const classes = useStyles()
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const services = useChange(bus, () => bus.services({ serviceClass: SRV_DEVICE_NAMER }));

    return <div className={classes.root}>
        {<ConnectAlert serviceClass={SRV_DEVICE_NAMER} />}
        {!services.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the device namer service on the bus!</Alert>}
        {services.map(service => <DeviceNameView key={service.id} service={service} />)}
    </div>
}