import { Card, CardContent, FormLabel, Grid, Switch, TextField } from "@material-ui/core";
import React, { ChangeEvent, useState } from "react";
import { JDService } from "../../../src/jdom/service";
import DeviceCardHeader from "./DeviceCardHeader";
import useServiceClient from "./useServiceClient";
import SettingsClient from "../../../src/jdom/settingsclient"
import { useChangeAsync } from "../jacdac/useChange";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
import CmdButton from "./CmdButton";

function SettingRow(props: { client: SettingsClient, name: string, mutable?: boolean }) {
    const { client, name, mutable } = props;
    const isSecret = name[0] == "$";
    const displayName = isSecret ? name.slice(1) : name;
    const value = useChangeAsync(client, c => isSecret ? Promise.resolve("...") : c?.getValue(name));
    const handleComponentDelete = async () => {
        await client.deleteValue(name)
    }
    const nameError = ""
    const valueError = ""
    return <Grid item xs={12}>
        <Grid container spacing={1}>
            <Grid item xs={4}>
                <TextField fullWidth={true} error={!!nameError} variant="outlined" label="key" helperText={nameError} value={displayName} type={isSecret ? "password" : "text"} disabled={true} />
            </Grid>
            <Grid item xs={4}>
                <TextField fullWidth={true} error={!!valueError} variant="outlined" label="value" helperText={valueError} value={value} type={isSecret ? "password" : "text"} disabled={true} />
            </Grid>
            {mutable && <Grid item>
                <CmdButton title="Delete settings" onClick={handleComponentDelete} icon={<DeleteIcon />} />
            </Grid>}
        </Grid>
    </Grid>
}

function AddSettingRow(props: { client: SettingsClient }) {
    const { client } = props;
    const [key, setKey] = useState("")
    const [value, setValue] = useState("")
    const [secret, setSecret] = useState(true)

    const handleKeyChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setKey(ev.target.value.trim())
    }
    const handleValueChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setValue(ev.target.value)
    }
    const handleChecked = (ev, checked: boolean) => {
        setSecret(checked);
    }
    const handleAdd = async () => {
        await client.setValue(`${secret ? "$" : ""}${key}`, value)
        setKey("")
        setValue("")
        setSecret(true)
    }
    const keyError = ""
    const valueError = ""

    return <Grid item xs={12}>
        <Grid container spacing={1}>
            <Grid item>
                <TextField fullWidth={true} error={!!keyError} variant="outlined" label="key" helperText={keyError} value={key} onChange={handleKeyChange} />
            </Grid>
            <Grid item>
                <TextField fullWidth={true} error={!!valueError} variant="outlined" label="value" helperText={valueError} value={value} onChange={handleValueChange} />
            </Grid>
            <Grid item>
                <Switch
                    value={secret}
                    onChange={handleChecked}
                />
                Secret
            </Grid>
            <Grid item>
                <CmdButton disabled={!!keyError || !!valueError} title="Add setting" onClick={handleAdd} icon={<AddIcon />} />
            </Grid>
        </Grid>
    </Grid>
}

export default function SettingsCard(props: { service: JDService, mutable?: boolean }) {
    const { service, mutable } = props;
    const client = useServiceClient(service, srv => new SettingsClient(srv));
    const keys = useChangeAsync(client, c => c?.listKeys());
    if (!client)
        return null // wait till loaded

    console.log({ keys })
    return <Card>
        <DeviceCardHeader device={service.device} showMedia={true} />
        <CardContent>
            <Grid container spacing={2}>
                {keys?.map(key => <SettingRow name={key} client={client} mutable={mutable} />)}
                {mutable && <AddSettingRow client={client} key="add" />}
            </Grid>
        </CardContent>
    </Card >
}
