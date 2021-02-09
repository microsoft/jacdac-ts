import React, { useContext, useState } from "react"
import { Card, CardActions, CardContent, CircularProgress, Grid, MenuItem } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service"
import { RequestedRole, RoleManagerClient } from "../../../src/jdom/rolemanagerclient"
import CmdButton from "./CmdButton"
import DeviceCardHeader from "./DeviceCardHeader"
import useServiceClient from "./useServiceClient"
import SelectWithLabel from "./ui/SelectWithLabel"
import DeviceName from "./DeviceName"
import { serviceName } from "../../../src/jdom/pretty"
import { addHost, hostDefinitionFromServiceClass } from "../../../src/hosts/hosts"
import JacdacContext, { JDContextProps } from "../../../src/react/Context"

const START_SIMULATOR = "__start_simulator"
const NO_CANDIDATES = "__no_candidates"

function RequestedRoleView(props: {
    requestedRole: RequestedRole,
    client: RoleManagerClient
}) {
    const { requestedRole, client } = props
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const [working, setWorking] = useState(false)
    const { name: role, serviceClass } = requestedRole;

    const handleStartClick = () => {
        addHost(bus, hostDefinition.services(), hostDefinition.name)
    }
    const handleChange = async (ev: React.ChangeEvent<{ value: unknown }>) => {
        const value: string = ev.target.value as string;
        if (value === START_SIMULATOR) {
            handleStartClick();
        } else if (value === NO_CANDIDATES) {
            // do nothing
        }
        else {
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
    }

    const noCandidates = !requestedRole.candidates?.length;
    const disabled = working;
    const value = requestedRole.bound?.id || ""
    const error = !value && "select a device"
    const hostDefinition = hostDefinitionFromServiceClass(serviceClass)

    return <Grid item>
        <SelectWithLabel
            fullWidth={true}
            disabled={disabled}
            label={role}
            value={value}
            onChange={handleChange}
            error={error}>
            {requestedRole.candidates?.map(candidate => <MenuItem key={candidate.nodeId} value={candidate.id}>
                <DeviceName device={candidate.device} />[{candidate.serviceIndex}]
            </MenuItem>)}
            {noCandidates && !hostDefinition && <MenuItem value={NO_CANDIDATES}>Please connect a device with a <b>{serviceName(requestedRole.serviceClass)}</b> service</MenuItem>}
            {hostDefinition && <MenuItem value={START_SIMULATOR}>start simulator</MenuItem>}
        </SelectWithLabel>
    </Grid>
}


export default function RoleManagerService(props: {
    service: JDService,
    clearRoles?: boolean
}) {
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const { service, clearRoles } = props
    const client = useServiceClient(service, srv => new RoleManagerClient(srv));
    const requestedRoles = useChange(client, c => c?.requestedRoles);

    const handleClearRoles = async () => await client?.clearRoles()
    const handleStartSimulators = async () => {
        requestedRoles.filter(role => !role.bound)
            .map(role => hostDefinitionFromServiceClass(role.serviceClass))
            .filter(hostDefinition => !!hostDefinition)
            .forEach(hostDefinition => addHost(bus, hostDefinition.services(), hostDefinition.name));
    }

    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            {!requestedRoles && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
            <Grid container spacing={1}>
                {requestedRoles?.map(rdev => <RequestedRoleView
                    key={rdev.name} requestedRole={rdev} client={client} />)}
            </Grid>
        </CardContent>
        <CardActions>
            {clearRoles && client && <CmdButton variant="outlined" trackName="rolemgr.clearroles" size="small"
                onClick={handleClearRoles}>
                Clear roles
            </CmdButton>}
            <CmdButton variant="outlined" trackName="rolemgr.startsims" disabled={!requestedRoles} size="small" onClick={handleStartSimulators}>
                Start simulators
            </CmdButton>
        </CardActions>
    </Card >
}