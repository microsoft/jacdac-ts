import React, { useState } from "react"
import { Box, MenuItem } from "@material-ui/core"
import DeviceName from "./DeviceName"
import { RoleManagerClient, RemoteRequestedDevice } from "../../../src/jdom/rolemanagerclient"
import { serviceName } from "../../../src/jdom/pretty"
import { Alert, AlertTitle } from "@material-ui/lab"
import SelectWithLabel from "./ui/SelectWithLabel"

export default function RemoteRequestDeviceView(props: {
    rdev: RemoteRequestedDevice,
    client: RoleManagerClient
}) {
    const { rdev, client } = props
    const [working, setWorking] = useState(false)
    const { role } = rdev;

    const handleChange = async (ev: React.ChangeEvent<{ value: unknown }>) => {
        const value: string = ev.target.value as string;
        const dev = rdev.candidates.find(c => c.id == value)
        if (dev && client) {
            try {
                setWorking(true)
                await client.setRole(dev, role)
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
            fullWidth={true}
            disabled={disabled}
            label={role}
            value={value}
            onChange={handleChange}
            error={error}>
            {rdev.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                <DeviceName device={candidate} />
            </MenuItem>)}
        </SelectWithLabel>}
        {noCandidates && <Alert severity="warning">
            <AlertTitle>No compatible device for "{role}"</AlertTitle>
            Please connect a device with <b>{serviceNames}</b> services.
        </Alert>}
    </Box>
}
