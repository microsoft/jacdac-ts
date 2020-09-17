import React, { useContext } from "react"
import { createStyles, makeStyles, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_DEVICE_NAMER } from "../../../src/dom/constants"
import useChange from "../jacdac/useChange"
import { JDDevice } from "../../../src/dom/device"
import DeviceName from "./DeviceName"
import { BusState } from "../../../src/dom/bus"
import ConnectAlert from "./ConnectAlert"
import { Alert } from "@material-ui/lab"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    }
}))

function DeviceNameView(props: { device: JDDevice }) {
    const { device } = props
    return <div>
        <h3>
            <DeviceName device={device} />
        </h3>
    </div>
}

export default function Namer(props: {}) {
    const classes = useStyles()
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)

    const devices = useChange(bus, () => bus.devices({ serviceClass: SRV_DEVICE_NAMER }));

    return <div className={classes.root}>
        {<ConnectAlert />}
        {!devices.length && connectionState == BusState.Connected && <Alert severity="info">We could not find any device with the device namer service on the bus!</Alert>}
        {devices.map(device => <DeviceNameView key={device.deviceId} device={device} />)}
    </div>
}