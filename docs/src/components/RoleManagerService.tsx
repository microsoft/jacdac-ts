import React, { useEffect, useState } from "react"
import { Box, Card, CardActions, CardContent, CardHeader, createStyles, FormControl, FormHelperText, Grid, InputLabel, List, ListItem, makeStyles, MenuItem, Select, Theme, Typography } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import DeviceName from "./DeviceName"
import { JDService } from "../../../src/jdom/service"
import { RoleManagerClient, RemoteRequestedDevice } from "../../../src/jdom/rolemanagerclient"
import { serviceName } from "../../../src/jdom/pretty"
import CmdButton from "./CmdButton"
import { Alert, AlertTitle } from "@material-ui/lab"
import DeviceCardHeader from "./DeviceCardHeader"
import { SelectWithLabel } from "./SelectWithLabel"

function RemoteRequestDeviceView(props: { rdev: RemoteRequestedDevice, client: RoleManagerClient }) {
    const { rdev, client } = props
    const [working, setWorking] = useState(false)
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
    const error = !value && "select a device"

    const serviceNames = rdev.services.map(serviceClass => serviceName(serviceClass)).join(', ')
    return <Box mb={2}>
        {!noCandidates && <SelectWithLabel
            disabled={disabled}
            label={label}
            value={value}
            error={error}>
            {rdev.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                <DeviceName device={candidate} />
            </MenuItem>)}
        </SelectWithLabel>}
        {noCandidates && <Alert severity="warning">
            <AlertTitle>No compatible device for {label}</AlertTitle>
            Please connect a device with {serviceNames} services.
        </Alert>}
    </Box>
}

export default function RoleManagerService(props: {
    service: JDService
}) {
    const { service } = props
    const [client, setClient] = useState<RoleManagerClient>(undefined)

    useChange(client)
    useEffect(() => {
        console.log(`creating client`)
        const c = new RoleManagerClient(service)
        setClient(c)
        return () => c.unmount()
    }, [service])

    if (!client)
        return null // wait till loaded

    const handleClearRoles = async () => await client?.clearRoles()
    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            {client?.remoteRequestedDevices.map(rdev => <RemoteRequestDeviceView key={rdev.name} rdev={rdev} client={client} />)}
        </CardContent>
        <CardActions>
            {client && <CmdButton size="small"
                onClick={handleClearRoles}>
                Clear roles
            </CmdButton>}
        </CardActions>
    </Card >
}