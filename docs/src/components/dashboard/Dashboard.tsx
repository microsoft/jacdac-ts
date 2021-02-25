import { Button, Grid, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import React, { useContext } from "react";
import { JDDevice } from "../../../../src/jdom/device";
import useSelectedNodes from "../../jacdac/useSelectedNodes";
import { isReading, isValueOrIntensity } from "../../../../src/jdom/spec";
import { splitFilter, strcmp, unique, uniqueMap } from "../../../../src/jdom/utils";
import Alert from "../ui/Alert";
import useDevices from "../hooks/useDevices";
import { MOBILE_BREAKPOINT } from "../layout";
import JacdacContext, { JacdacContextProps } from "../../jacdac/Context";
import ConnectButton from "../../jacdac/ConnectButton";
import AppContext from "../AppContext";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import DashboardDeviceGroup from "./DashboardDeviceGroup";
import AddIcon from '@material-ui/icons/Add';
import Flags from "../../../../src/jdom/flags";
import { AlertTitle } from "@material-ui/lab";
import hosts, { addHost } from "../../../../src/hosts/hosts";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ClearIcon from '@material-ui/icons/Clear';

function deviceSort(l: JDDevice, r: JDDevice): number {
    const srvScore = (srv: jdspec.ServiceSpec) => srv.packets
        .reduce((prev, pkt) => prev + (isReading(pkt) ? 10 : isValueOrIntensity(pkt) ? 1 : 0), 0) || 0;
    const score = (srvs: jdspec.ServiceSpec[]) => srvs.reduce((prev, srv) => srvScore(srv), 0)

    const ls = score(l.services().slice(1).map(srv => srv.specification).filter(spec => !!spec))
    const rs = score(r.services().slice(1).map(srv => srv.specification).filter(spec => !!spec))
    if (ls !== rs)
        return -ls + rs;
    return strcmp(l.deviceId, r.deviceId);
}

export interface DashboardDeviceProps {
    showHeader?: boolean,
    showAvatar?: boolean
}

export default function Dashboard(props: DashboardDeviceProps) {
    const { ...other } = props;
    const { bus } = useContext<JacdacContextProps>(JacdacContext)
    const { toggleShowDeviceHostsDialog } = useContext(AppContext)
    const devices = useDevices({ announced: true, ignoreSelf: true })
        .sort(deviceSort);
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));
    const { selected, toggleSelected } = useSelectedNodes(mobile)
    const [hosted, physicals] = splitFilter(devices, d => !!bus.deviceHost(d.deviceId))

    const onStartAll = () => {
        const hostDefinitions = uniqueMap(
            hosts().filter(hd => hd.serviceClasses.length === 1),
            hd => hd.serviceClasses[0].toString(),
            h => h);
        hostDefinitions.forEach(hd => addHost(bus, hd.services()))
    }
    const handleClearSimulators = () => {
        bus.deviceHosts().forEach(dev => bus.removeDeviceHost(dev));
    }

    return <>
        <DashboardDeviceGroup
            title="Simulators"
            action={<>
                <IconButtonWithTooltip
                    title="start simulator"
                    onClick={toggleShowDeviceHostsDialog}>
                    <AddIcon />
                </IconButtonWithTooltip>
                <IconButtonWithTooltip
                    title="clear simulators"
                    onClick={handleClearSimulators}>
                    <ClearIcon />
                </IconButtonWithTooltip>            </>}
            devices={hosted}
            expanded={selected}
            toggleExpanded={toggleSelected}
            {...other} />
        <DashboardDeviceGroup
            title="Devices"
            action={<ConnectButton full={false} transparent={true} showAlways={true} />}
            devices={physicals}
            expanded={selected}
            toggleExpanded={toggleSelected}
            {...other}>
            {!physicals.length && <Grid item xs={12}>
                <Alert severity="info">
                    Please <ConnectButton showAlways={true} full={true} transparent={true} /> to see your physical devices.
                </Alert>
            </Grid>}
        </DashboardDeviceGroup>
        {Flags.diagnostics &&
            <Alert>
                <AlertTitle>Start all simulators</AlertTitle>
                <Typography variant="caption">
                    This is going to start a simulator for each known service with a simulator.
                    <Button variant="contained" onClick={onStartAll}>start</Button>
                </Typography>
            </Alert>}
    </>
}