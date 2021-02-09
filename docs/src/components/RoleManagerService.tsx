import React, { useContext, useState } from "react"
import { Button, Card, CardActions, CardContent, Grid, MenuItem } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service"
import { RequestedRole, RoleManagerClient } from "../../../src/jdom/rolemanagerclient"
import CmdButton from "./CmdButton"
import DeviceCardHeader from "./DeviceCardHeader"
import useServiceClient from "./useServiceClient"
import SelectWithLabel from "./ui/SelectWithLabel"
import DeviceName from "./DeviceName"
import { Alert, AlertTitle } from "@material-ui/lab"
import { serviceName } from "../../../src/jdom/pretty"
import { addHost, hostDefinitionFromServiceClass } from "../../../src/hosts/hosts"
import JacdacContext, { JDContextProps } from "../../../src/react/Context"

function RequestedRoleView(props: {
    requestedRole: RequestedRole,
    client: RoleManagerClient
}) {
    const { requestedRole, client } = props
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const [working, setWorking] = useState(false)
    const { name: role, serviceClass } = requestedRole;

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
    const hostDefinition = hostDefinitionFromServiceClass(serviceClass)
    const handleStartClick = () => {
        addHost(bus, hostDefinition.services(), hostDefinition.name)
    }

    return <Grid item>
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
            {hostDefinition
                ? <>Please connect a device with a <b>{serviceName(requestedRole.serviceClass)}</b> service
                or <Button variant="outlined" aria-label="start a simulator" onClick={handleStartClick}>start</Button> a simulator.</>
                : <>Please connect a device with a <b>{serviceName(requestedRole.serviceClass)}</b> service.</>}
        </Alert>}
    </Grid>
}


export default function RoleManagerService(props: {
    service: JDService,
    clearRoles?: boolean
}) {
    const { service, clearRoles } = props
    const client = useServiceClient(service, srv => new RoleManagerClient(srv));
    const requestedRoles = useChange(client, c => c?.requestedRoles);

    const handleClearRoles = async () => await client?.clearRoles()
    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            <Grid container spacing={1}>
                {requestedRoles?.map(rdev => <RequestedRoleView
                    key={rdev.name} requestedRole={rdev} client={client} />)}
            </Grid>
        </CardContent>
        <CardActions>
            {clearRoles && client && <CmdButton trackName="rolemgr.clearroles" size="small"
                onClick={handleClearRoles}>
                Clear roles
            </CmdButton>}
        </CardActions>
    </Card >
}