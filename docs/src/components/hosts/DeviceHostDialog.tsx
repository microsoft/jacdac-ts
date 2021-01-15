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
        const host = hostDefinitions.find(h => h.name === selected);
        addHost(host);
        enqueueSnackbar(`${host.name} started...`, { variant: "info" })
        onAdded?.();
    }
    const handleAddAll = () => {
        hostDefinitions
            .forEach(addHost);
        enqueueSnackbar(`${hostDefinitions.length} devices started...`, { variant: "info" })
        onAddedAll?.();
    }

    return <Grid container spacing={2}>
        <Grid item xs={12}>
            <SelectWithLabel fullWidth={true} helperText={"Select the service that will run on the simulator"} label={"Virtual device"} value={selected} onChange={handleChange}>
                {hostDefinitions.map((host) => <MenuItem key={host.name} value={host.name}>{host.name}</MenuItem>)}
            </SelectWithLabel>
        </Grid>
        <Grid item>
            <Button color="primary" variant="contained" title="Start new simulator" onClick={handleClick} startIcon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />}>
                start
            </Button>
        </Grid>
        <Grid item xs={12}>
            <Alert severity="info">
                Reload the page to clear out simulators.
                <Box component="span" ml={"0.5em"}><Button variant="outlined" onClick={handleAddAll}>start all</Button></Box>
            </Alert>
        </Grid>
    </Grid>
}