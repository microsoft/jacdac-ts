import { Card, CardContent, Grid, TextField } from "@material-ui/core";
import React, { useState } from "react";
import { JDService } from "../../../src/jdom/service";
import DeviceCardHeader from "./DeviceCardHeader";
import useServiceClient from "./useServiceClient";
import SettingsClient from "../../../src/jdom/settingsclient"
import useChange from "../jacdac/useChange";
import useEffectAsync from "./useEffectAsync";
import IconButtonWithTooltip from "./IconButtonWithTooltip";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';

function SettingRow(props: { client: SettingsClient, key: string  }) {
    const { client, key } = props;
    const handleComponentDelete = async () => {
        await client.deleteValue(key)
    }
    const keyError = ""
    return <Grid item xs={12}>
        <Grid container spacing={2}>
            <Grid item xs={10}>
                <TextField fullWidth={true} error={!!keyError} variant="outlined" label="name" helperText={keyError} value={key} />
            </Grid>
            <Grid item>
                <IconButtonWithTooltip title="Delete settings" onClick={handleComponentDelete}>
                    <DeleteIcon />
                </IconButtonWithTooltip>
            </Grid>
        </Grid>
    </Grid>
}

export default function SettingsCard(props: { service: JDService }) {
    const { service } = props;
    const [keys, setKeys] = useState<string[]>([])
    const client = useServiceClient(service, srv => new SettingsClient(srv));
    useChange(client)
    if (!client)
        return null // wait till loaded

    useEffectAsync(async (mounted) => {
        let ks = await client.listKeys();
        if (mounted)
            setKeys(ks);
    });
    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            <Grid container>
                {keys?.map(key => <SettingRow key={key} client={client} />)}
            </Grid>
        </CardContent>
    </Card >
}
