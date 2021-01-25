import { Card, CardContent, CardHeader, Collapse, Grid, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import React from "react";
import { SRV_CTRL, SRV_LOGGER } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import DeviceName from "../DeviceName";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import useDeviceSpecification from "../../jacdac/useDeviceSpecification";
import DeviceAvatar from "../devices/DeviceAvatar"
import DashboardServiceWidget from "./DashboardServiceWidget";
import DeviceActions from "../DeviceActions";
import DashboardServiceDetails from "./DashboardServiceDetails";
import { MOBILE_BREAKPOINT } from "../layout";
import useDeviceName from "../useDeviceName";

const ignoredServices = [
    SRV_CTRL,
    SRV_LOGGER
]

export default function DashboardDevice(props: {
    device: JDDevice,
    expanded?: boolean,
    toggleExpanded?: () => void
}) {
    const { device, expanded, toggleExpanded } = props;
    const name = useDeviceName(device)
    const services = useChange(device, () => device.services()
        .filter(service => ignoredServices.indexOf(service.serviceClass) < 0
            && !!service.specification));
    const { specification } = useDeviceSpecification(device);
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));

    return (
        <Card aria-live="polite" aria-label={`device ${name}`}>
            <CardHeader
                avatar={<DeviceAvatar device={device} />}
                action={
                    <DeviceActions device={device} showStopHost={expanded && !mobile} hideIdentity={true} showReset={expanded && !mobile}>
                        {toggleExpanded && <IconButtonWithTooltip onClick={toggleExpanded} title={expanded ? "Collapse" : "Expand"}>
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButtonWithTooltip>}
                    </DeviceActions>
                }
                title={
                    <Collapse in={expanded}>
                        <DeviceName expanded={expanded} showShortId={false} device={device} />
                    </Collapse>
                }
                subheader={<>
                    {!mobile && specification && <Typography variant="caption" gutterBottom>
                        {specification.name}
                    </Typography>}
                </>}
            />
            <CardContent>
                <Grid container spacing={1} justify="center" alignItems="center" alignContent="space-between">
                    {services?.map(service => <Grid key={"widget" + service.service_index} item>
                        <DashboardServiceWidget service={service} expanded={expanded} services={services} />
                    </Grid>)}
                </Grid>
                {expanded && <Grid container direction="column" spacing={1} alignContent="stretch">
                    {services?.map(service => <DashboardServiceDetails key={"details" + service.service_index} service={service} expanded={expanded} />)}
                </Grid>}
            </CardContent>
        </Card>
    );
}