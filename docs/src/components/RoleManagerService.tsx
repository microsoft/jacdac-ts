import React, { useEffect, useState } from "react"
import { Card, CardActions, CardContent, CardHeader, createStyles, FormControl, Grid, InputLabel, List, ListItem, makeStyles, MenuItem, Select, Theme, Typography } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import DeviceName from "./DeviceName"
import { JDService } from "../../../src/dom/service"
import { RoleManagerClient, RemoteRequestedDevice } from "../../../src/dom/rolemanagerclient"
import { Button } from "gatsby-theme-material-ui"
import { serviceName, serviceShortIdOrClass } from "../../../src/dom/pretty"
import useGridBreakpoints from "./useGridBreakpoints"
import CmdButton from "./CmdButton"
import { Alert } from "@material-ui/lab"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1)
    },
    fluid: {
        flexGrow: 1
    },
    floatRight: {
        float: "right"
    }
}))

function RemoteRequestDeviceView(props: { rdev: RemoteRequestedDevice, client: RoleManagerClient }) {
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
                await client.setRole(dev, rdev.name)
                await dev.identify()
            }
            finally {
                setWorking(false)
            }
        }
    }

    const noCandidates = !rdev.candidates?.length;
    const disabled = working;
    const value = rdev.boundTo?.id || ""
    const error = !value
    return <Card>
        <CardHeader title={label} subheader={"role"} />
        <CardContent>
            {rdev.services.map(serviceClass => <Button key={"srv" + serviceClass} variant="contained" to={`/services/${serviceShortIdOrClass(serviceClass)}`}>{serviceName(serviceClass)}</Button>)}
        </CardContent>
        <CardActions>
            {!noCandidates && <FormControl variant="outlined" className={classes.fluid}>
                <InputLabel key="label">device</InputLabel>
                <Select
                    disabled={disabled}
                    label={"device"}
                    value={value}
                    error={error}
                    onChange={handleChange}>
                    {rdev.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                        <DeviceName device={candidate} />
                    </MenuItem>)}
                </Select>
            </FormControl >}
            {noCandidates && <Alert severity="warning">Please connect a compatible device.</Alert>}
        </CardActions>
    </Card>
}

export default function RoleManagerService(props: {
    service: JDService,
    showDeviceName?: boolean
}) {
    const { service, showDeviceName } = props
    const [client, setClient] = useState<RoleManagerClient>(undefined)
    const classes = useStyles()
    const gridBreakpoints = useGridBreakpoints()

    useChange(client)
    useEffect(() => {
        console.log(`creating client`)
        const c = new RoleManagerClient(service)
        setClient(c)
        return () => c.unmount()
    }, [service])

    if (!client)
        return <></> // wait till loaded

    const handleClearRoles = async () => await client?.clearRoles()
    return <div className={classes.root}>
        {showDeviceName && <h2>
            <DeviceName device={service.device} />
            {client && <CmdButton variant="outlined" size="small"
                className={classes.floatRight}
                onClick={handleClearRoles}>
                Clear roles
            </CmdButton>}
        </h2>}
        <Grid container spacing={2}>
            {client?.remoteRequestedDevices.map(rdev => <Grid {...gridBreakpoints} item key={'red' + rdev.name}>
                <RemoteRequestDeviceView rdev={rdev} client={client} />
            </Grid>
            )}
        </Grid>
    </div>
}