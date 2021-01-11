import { Card, CardContent, CardHeader, Grid, Typography, useMediaQuery, useTheme } from "@material-ui/core";
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
import DashboardServiceView from "./DashboardServiceView";
import DeviceActions from "../DeviceActions";

const ignoredServices = [
    SRV_CTRL,
    SRV_LOGGER
]

export default function DashboardDevice(props: {
    device: JDDevice,
    expanded: boolean,
    toggleExpanded: () => void
}) {
    const { device, expanded, toggleExpanded } = props;
    const services = useChange(device, () => device.services()
        .filter(service => ignoredServices.indexOf(service.serviceClass) < 0
            && !!service.specification));
    const { specification } = useDeviceSpecification(device);
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));

    return (
        <Card>
            <CardHeader
                avatar={<DeviceAvatar device={device} />}
                action={<DeviceActions device={device} hideIdentity={!expanded} showReset={expanded}>
                    <IconButtonWithTooltip onClick={toggleExpanded} title={expanded ? "Collapse" : "Expand"}>
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButtonWithTooltip>
                </DeviceActions>}
                title={<DeviceName showShortId={false} device={device} />}
                subheader={<>
                    {!mobile && specification && <Typography variant="caption" gutterBottom>
                        {specification.name}
                    </Typography>}
                </>}
            />
            <CardContent>
                <Grid container spacing={1} justify="center">
                    {services?.map(service => <DashboardServiceView key={service.service_index} service={service} expanded={expanded} />)}
                </Grid>
            </CardContent>
        </Card>
    );
}