import React, { useContext, useMemo, useState } from "react";
import { Box, Grid } from "@material-ui/core";
import { Button } from "gatsby-theme-material-ui";
import KindIcon from "../KindIcon";
import SelectWithLabel from "../ui/SelectWithLabel";

import JDDeviceHost from "../../../../src/jdom/devicehost";
import { MenuItem } from '@material-ui/core';
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import Alert from "../ui/Alert";
import { useSnackbar } from "notistack";
import JDServiceHost from "../../../../src/jdom/servicehost";
import hosts from "../../../../src/hosts/hosts";
import { delay } from "../../../../src/jdom/utils";

export default function DeviceHostDialog(props: { onAdded?: () => void, onAddedAll?: () => void }) {
    const { onAdded, onAddedAll } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [selected, setSelected] = useState("button");
    const { enqueueSnackbar } = useSnackbar();
    const hostDefinitions = useMemo(() => hosts(), []);

    const addHost = (host: { name: string; services: () => JDServiceHost[]; }) => {
        const d = new JDDeviceHost(host.services());
        bus.addDeviceHost(d);
    }
    const handleChange = (ev: React.ChangeEvent<{ value: unknown }>) => {
        setSelected(ev.target.value as string);
    };
    const handleClick = () => {
        onAdded?.();
        const host = hostDefinitions.find(h => h.name === selected);
        addHost(host);
        enqueueSnackbar(`${host.name} started...`, { variant: "info" })
    }
    const handleAddAll = async () => {
        enqueueSnackbar(`starting ${hostDefinitions.length} simulator...`, {
            variant: "info",
            key: "startdevicehosts"
        })
        onAddedAll?.();
        for (const hostDef of hostDefinitions) {
            await delay(100);
            addHost(hostDef);
        }
    }

    return <Grid container spacing={2}>
        <Grid item xs={12}>
            <SelectWithLabel fullWidth={true} helperText={"Select the service that will run on the simulator"} label={"Simulator"} value={selected} onChange={handleChange}>
                {hostDefinitions.map((host) => <MenuItem key={host.name} value={host.name}>{host.name}</MenuItem>)}
            </SelectWithLabel>
        </Grid>
        <Grid item>
            <Grid container spacing={1}>
                <Grid item>
                    <Button color="primary" variant="contained" title="Start new simulator" onClick={handleClick} startIcon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />}>
                        start
                </Button>
               </Grid>
                <Grid item>
                    <Button variant="outlined" onClick={handleAddAll}>start all</Button>
                </Grid>
            </Grid>
        </Grid>
    </Grid>
}