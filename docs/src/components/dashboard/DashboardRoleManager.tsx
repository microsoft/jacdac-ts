
import { Grid, Switch, Typography } from "@material-ui/core";
import React, { useState } from "react";
import { SRV_ROLE_MANAGER } from "../../../../src/jdom/constants";
import { RoleManagerClient } from "../../../../src/jdom/rolemanagerclient";
import useServiceClient from "../useServiceClient"
import RemoteRequestDeviceView from "../RemoteRequestDeviceView";
import { addServiceComponent, DashboardServiceProps } from "./DashboardServiceWidget";

export default function DashboardRoleManager(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const [autoBind, setAutoBind] = useState(false);
    const roleManagerClient = useServiceClient(service, srv => new RoleManagerClient(srv, { autoBind }), [autoBind]);
    const handleAutoBind = () => setAutoBind(!autoBind);

    return <>
        <Grid item xs={12}>
            <Switch value={autoBind} onChange={handleAutoBind} />
            <Typography component="span" variant="caption">assign roles automatically</Typography>
        </Grid>
        {expanded && roleManagerClient?.remoteRequestedDevices
            .map(rdev => <Grid key={rdev.name} item>
                <RemoteRequestDeviceView rdev={rdev} client={roleManagerClient} />
            </Grid>)}
    </>
}