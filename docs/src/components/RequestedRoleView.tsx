import React, { useState } from "react"
import { Box, MenuItem } from "@material-ui/core"
import DeviceName from "./DeviceName"
import { RoleManagerClient, RequestedRole } from "../../../src/jdom/rolemanagerclient"
import { serviceName } from "../../../src/jdom/pretty"
import { Alert, AlertTitle } from "@material-ui/lab"
import SelectWithLabel from "./ui/SelectWithLabel"

export default function RequestedRoleView(props: {
    requestedRole: RequestedRole,
    client: RoleManagerClient
}) {
    const { requestedRole, client } = props
    const [working, setWorking] = useState(false)
    const { name: role } = requestedRole;

    const handleChange = async (ev: React.ChangeEvent<{ value: unknown }>) => {
        const value: string = ev.target.value as string;
        const srv = requestedRole.candidates.find(c => c.id == value)
        if (srv && client) {
            try {
                setWorking(true)
                await client.setRole(srv, role)
                await srv.device.identify()
            }
            finally {
                setWorking(false)
            }
        }
    }

    const noCandidates = !requestedRole.candidates?.length;
    const disabled = working;
    const value = requestedRole.bound?.id || ""
    const error = !value && "select a device"

    return <Box mb={2}>
        {!noCandidates && <SelectWithLabel
            fullWidth={true}
            disabled={disabled}
            label={role}
            value={value}
            onChange={handleChange}
            error={error}>
            {requestedRole.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                <DeviceName device={candidate.device} />[{candidate.serviceIndex}]
            </MenuItem>)}
        </SelectWithLabel>}
        {noCandidates && <Alert severity="warning">
            <AlertTitle>No compatible device for "{role}"</AlertTitle>
            Please connect a device with a <b>{serviceName(requestedRole.serviceClass)}</b> service.
        </Alert>}
    </Box>
}
