import { Button, Dialog, DialogContent, DialogTitle, Grid, MenuItem } from "@material-ui/core";
import { useSnackbar } from "notistack";
import React, { useContext, useMemo, useState } from "react";
import { useId } from "react-use-id-hook";
import hosts from "../../../../src/hosts/hosts";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import JDDeviceHost from "../../../../src/jdom/devicehost";
import Flags from "../../../../src/jdom/flags";
import JDServiceHost from "../../../../src/jdom/servicehost";
import { delay } from "../../../../src/jdom/utils";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import KindIcon from "../KindIcon";
import SelectWithLabel from "../ui/SelectWithLabel";

export default function StartSimulatorDialog(props: { open: boolean, onClose: () => void }) {
    const { open, onClose } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const deviceHostDialogId = useId();
    const deviceHostLabelId = useId();

    const { } = props;
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
        onClose();
    }
    const handleAddAll = async () => {
        enqueueSnackbar(`starting ${hostDefinitions.length} simulators...`, {
            variant: "info",
            key: "startdevicehosts"
        })
        onClose();
        for (const hostDef of hostDefinitions) {
            await delay(100);
            addHost(hostDef);
        }
    }

    return <Dialog id={deviceHostDialogId} aria-labelledby={deviceHostLabelId}
        open={open} onClose={onClose}>
        <DialogTitle id={deviceHostLabelId}>Start a device simulator</DialogTitle>
        <DialogContent>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <SelectWithLabel fullWidth={true} helperText={"Select the service that will run on the simulator"} label={"Simulator"} value={selected} onChange={handleChange}>
                        {hostDefinitions.map((host) => <MenuItem key={host.name} value={host.name}>{host.name}</MenuItem>)}
                    </SelectWithLabel>
                </Grid>
                <Grid item>
                    <Grid container spacing={1}>
                        <Grid item>
                            <Button aria-label={`start ${selected}`} color="primary" variant="contained" title="Start new simulator" onClick={handleClick}
                                startIcon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />}>
                                start</Button>
                        </Grid>
                        {Flags.diagnostics && <Grid item>
                            <Button variant="outlined" onClick={handleAddAll}>start all simulators</Button>
                        </Grid>}
                    </Grid>
                </Grid>
            </Grid>
        </DialogContent>
    </Dialog>

}