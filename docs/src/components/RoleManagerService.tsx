import React from "react"
import { Card, CardActions, CardContent } from "@material-ui/core"
import useChange from "../jacdac/useChange"
import { JDService } from "../../../src/jdom/service"
import { RoleManagerClient } from "../../../src/jdom/rolemanagerclient"
import CmdButton from "./CmdButton"
import DeviceCardHeader from "./DeviceCardHeader"
import useServiceClient from "./useServiceClient"
import RemoteRequestDeviceView from "./RemoteRequestDeviceView"

export default function RoleManagerService(props: {
    service: JDService,
    clearRoles?: boolean
}) {
    const { service, clearRoles } = props
    const client = useServiceClient(service, srv => new RoleManagerClient(srv));
    useChange(client)

    const handleClearRoles = async () => await client?.clearRoles()
    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            {client?.remoteRequestedDevices.map(rdev => <RemoteRequestDeviceView key={rdev.name} rdev={rdev} client={client} />)}
        </CardContent>
        <CardActions>
            {clearRoles && client && <CmdButton trackName="rolemgr.clearroles" size="small"
                onClick={handleClearRoles}>
                Clear roles
            </CmdButton>}
        </CardActions>
    </Card >
}