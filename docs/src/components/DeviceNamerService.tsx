import React, { useEffect, useState } from "react"
import { Card, CardActions, CardContent, CardHeader, createStyles, FormControl, Grid, InputLabel, List, ListItem, makeStyles, MenuItem, Select, Theme } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import DeviceName from "./DeviceName"
import { JDService } from "../../../src/dom/service"
import { DeviceNamerClient, RemoteRequestedDevice } from "../../../src/dom/namer"
import { Button } from "gatsby-theme-material-ui"
import { serviceName, serviceShortIdOrClass } from "../../../src/dom/pretty"
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
                await dev.identify()
            }
            finally {
                setWorking(false)
            }
        }
    }
    const MISSING = "Not found"
    const disabled = working;
    const value = rdev.boundTo?.id || MISSING
    const error = !value || value === MISSING
    return <Card>
        <CardHeader title={label} />
        <CardContent>
            {rdev.services.map(serviceClass => <Button variant="contained" to={`/services/${serviceShortIdOrClass(serviceClass)}`}>{serviceName(serviceClass)}</Button>)}
        </CardContent>
        <CardActions>
            <FormControl variant="outlined" className={classes.fluid}>
                <InputLabel key="label">device</InputLabel>
                <Select
                    disabled={disabled}
                    label={"device"}
                    value={value}
                    error={error}
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

export function DeviceNamerService(props: { service: JDService }) {
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