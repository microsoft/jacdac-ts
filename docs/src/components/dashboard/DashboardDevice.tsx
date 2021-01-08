import { Card, CardContent, CardHeader, Grid, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import React, { createElement } from "react";
import { SRV_CTRL, SRV_LOGGER, SRV_ROLE_MANAGER } from "../../../../src/jdom/constants";
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
import DashboardService from "./DashboardService";
import DashboardRoleManager from "./DashboardRoleManager";
import { JDService } from "../../../../src/jdom/service";
import DashboardServiceView from "./DashboardServiceView";

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
                action={<>
                    <IconButtonWithTooltip onClick={toggleExpanded} title={expanded ? "Collapse" : "Expand"}>
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButtonWithTooltip>
                </>}
                title={<DeviceName showShortId={false} device={device} />}
                subheader={<>
                    {!mobile && specification && <Typography variant="caption" gutterBottom>
                        {specification.name}
                    </Typography>}
                </>}
            />
            <CardContent>
                <Grid container>
                    {services?.map(service => <Grid item xs={12} key={service.service_index}>
                        <DashboardServiceView service={service} expanded={expanded} />
                    </Grid>)}
                </Grid>
            </CardContent>
        </Card>
    );
}