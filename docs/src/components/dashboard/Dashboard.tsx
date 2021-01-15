import { Button, Card, CardActions, CardContent, Grid, useMediaQuery, useTheme } from "@material-ui/core";
import React, { useContext } from "react";
import { JDDevice } from "../../../../src/jdom/device";
import useSelectedNodes from "../../jacdac/useSelectedNodes";
import { isReading, isValueOrIntensity } from "../../../../src/jdom/spec";
import { splitFilter, strcmp } from "../../../../src/jdom/utils";
import Alert from "../ui/Alert";
import useDevices from "../hooks/useDevices";
import DashboardDevice from "./DashboardDevice";
import { MOBILE_BREAKPOINT } from "../layout";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { GridBreakpoints } from "../useGridBreakpoints";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import KindIcon from "../KindIcon";
import GridHeader from "../ui/GridHeader"
import JacdacIcon from "../icons/JacdacIcon";
import ConnectButton from "../../jacdac/ConnectButton";
import AppContext from "../AppContext";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";

function deviceSort(l: JDDevice, r: JDDevice): number {
    const srvScore = (srv: jdspec.ServiceSpec) => srv.packets
        .reduce((prev, pkt) => prev + (isReading(pkt) ? 10 : isValueOrIntensity(pkt) ? 1 : 0), 0)
    const score = (srvs: jdspec.ServiceSpec[]) => srvs.reduce((prev, srv) => srvScore(srv), 0)

    const ls = score(l.services().slice(1).map(srv => srv.specification))
    const rs = score(r.services().slice(1).map(srv => srv.specification))
    if (ls !== rs)
        return -ls + rs;
    return strcmp(l.deviceId, r.deviceId);
}

function DeviceGroup(props: {
    title: string,
    icon?: JSX.Element,
    action?: JSX.Element,
    devices: JDDevice[],
    breakpoints: (device: JDDevice) => GridBreakpoints,
    selected: (device: JDDevice) => boolean,
    toggleSelected: (device: JDDevice) => void,
    children?: JSX.Element | JSX.Element[]
}) {
    const { title, icon, action, devices, breakpoints, selected, toggleSelected, children } = props;
    const handleExpand = (device: JDDevice) => () => toggleSelected(device)

    return <>
        <GridHeader title={title} icon={icon} action={action} />
        {devices?.map(device => <Grid key={device.id} item {...breakpoints(device)}>
            <DashboardDevice device={device} expanded={selected(device)} toggleExpanded={handleExpand(device)} />
        </Grid>)}
        {children}
    </>
}

export default function Dashboard(props: {}) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { toggleShowDeviceHostsDialog } = useContext(AppContext)
    const devices = useDevices({ announced: true, ignoreSelf: true })
        .sort(deviceSort);
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));
    const { selected, toggleSelected } = useSelectedNodes(mobile)
    const breakpoints = (device: JDDevice): GridBreakpoints => {
        const readings = device.services()
            .map(srv => srv.readingRegister ? 1 : 0)
            .reduce((c: number, v) => c + v, 0);

        if (readings > 2)
            return { xs: 12, sm: 12, md: 12, lg: 6, xl: 4 };
        else if (readings == 2)
            return { xs: 12, sm: 6, md: 6, lg: 4, xl: 3 };
        else
            return { xs: selected(device) ? 12 : 6, sm: 6, md: 6, lg: 4, xl: 3 };
    }

    const [hosted, physicals] = splitFilter(devices, d => !!bus.deviceHost(d.deviceId))

    return <Grid container spacing={2}>
        <DeviceGroup
            title="Simulators"
            action={<IconButtonWithTooltip
                title="start simulator"
                onClick={toggleShowDeviceHostsDialog}>
                <KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />
            </IconButtonWithTooltip>}
            devices={hosted}
            breakpoints={breakpoints}
            selected={selected}
            toggleSelected={toggleSelected} />
        <DeviceGroup
            title="Devices"
            action={<ConnectButton full={false} transparent={true} showAlways={true} />}
            devices={physicals}
            breakpoints={breakpoints}
            selected={selected}
            toggleSelected={toggleSelected}
        >
            {!physicals.length && <Grid item xs={12}>
                <Alert severity="info">
                    Please <ConnectButton full={true} transparent={true} /> to see your physical devices.
                </Alert>
            </Grid>}
        </DeviceGroup>
    </Grid >
}