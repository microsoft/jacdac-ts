import React, { useContext, useEffect, useState } from "react"
import { Card, CardActions, CardContent, CardHeader, createStyles, FormControl, Grid, InputLabel, List, ListItem, makeStyles, MenuItem, Select, Theme } from "@material-ui/core"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { SRV_DEVICE_NAMER } from "../../../src/dom/constants"
import useChange from "../jacdac/useChange"
import { JDDevice } from "../../../src/dom/device"
import DeviceName from "./DeviceName"
import { BusState } from "../../../src/dom/bus"
import ConnectAlert from "./ConnectAlert"
import { Alert } from "@material-ui/lab"
import { JDService } from "../../../src/dom/service"
import { DeviceNamerClient, RemoteRequestedDevice } from "../../../src/dom/namer"
import { Button } from "gatsby-theme-material-ui"
import { serviceName } from "../../../src/dom/pretty"
import useGridBreakpoints from "./useGridBreakpoints"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    fluid: {
        flexGrow: 1
    },
    floatRight: {
        float: "right"
    }
}))

function RemoteRequestDeviceView(props: { rdev: RemoteRequestedDevice, client: DeviceNamerClient }) {
    const { rdev, client } = props
    const [working, setWorking] = useState(false)
    const classes = useStyles()
    const label = rdev.name;
    const handleChange = async (ev: React.ChangeEvent<{ value: string }>) => {
        const value: string = ev.target.value;
        const dev = rdev.candidates.find(c => c.id == value)
        if (dev && client) {
            try {
                setWorking(true)
                await client.setName(dev, rdev.name)
            }
            finally {
                setWorking(false)
            }
        }
    }
    const MISSING = "Not found"
    const disabled = working;
    return <Card>
        <CardHeader title={label} />
        <CardContent>
            {rdev.services.map(serviceClass => <Button variant="contained" to={`/services/0x${serviceClass.toString(16)}`}>{serviceName(serviceClass)}</Button>)}
        </CardContent>
        <CardActions>
            <FormControl variant="outlined" className={classes.fluid}>
                <InputLabel key="label">device</InputLabel>
                <Select
                    disabled={disabled}
                    label={"device"}
                    value={rdev.boundTo?.id || MISSING}
                    onChange={handleChange}>
                    {!rdev.candidates?.length && <MenuItem key={"none"} value={MISSING}>{MISSING}</MenuItem>}
                    {rdev.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                        <DeviceName device={candidate} />
                    </MenuItem>)}
                </Select>
            </FormControl >
        </CardActions>
    </Card>
}

function DeviceNameView(props: { service: JDService }) {
    const { service } = props
    const [client, setClient] = useState<DeviceNamerClient>(undefined)
    const [working, setWorking] = useState(false)
    const classes = useStyles()
    const gridBreakpoints = useGridBreakpoints()

    useChange(client)
    useEffect(() => {
        console.log(`creating client`)
        const c = new DeviceNamerClient(service)
        setClient(c)
        return () => c.unmount()
    }, [service])

    if (!client)
        return <></> // wait till loaded

    const handleClearNames = async () => {
        try {
            setWorking(true)
            await client?.clearNames()
        }
        finally {
            setWorking(false)
        }
    }
    return <div>
        <h2>
            <DeviceName device={service.device} />
            {client && <Button variant="outlined" size="small"
                className={classes.floatRight}
                onClick={handleClearNames}
                disabled={working}>
                Clear names
            </Button>}
        </h2>
        <Grid container spacing={2}>
            {client?.remoteRequestedDevices.map(rdev => <Grid {...gridBreakpoints} item key={'red' + rdev.name}>
                <RemoteRequestDeviceView rdev={rdev} client={client} />
            </Grid>
            )}
        </Grid>
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