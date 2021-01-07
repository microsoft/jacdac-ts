import { Card, CardContent, CardHeader, Grid, GridSize, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import React, { useContext, useMemo } from "react";
import { SRV_CTRL, SRV_LOGGER, SRV_ROLE_MANAGER, SystemReg } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";
import { JDService } from "../../../../src/jdom/service";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from "../../jacdac/useChange";
import useSelectedNodes from "../../jacdac/useSelectedNodes";
import AutoGrid from "../ui/AutoGrid";
import RegisterInput from "../RegisterInput";
import { isReading, isRegister, isValueOrIntensity } from "../../../../src/jdom/spec";
import DeviceName from "../DeviceName";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import useDeviceSpecification from "../../jacdac/useDeviceSpecification";
import { strcmp } from "../../../../src/jdom/utils";
import ConnectAlert from "../alert/ConnectAlert"
import DeviceAvatar from "../devices/DeviceAvatar"
import Alert from "../ui/Alert";
import useDevices from "../hooks/useDevices";
import useServices from "../hooks/useServices";
import { RoleManagerClient } from "../../../../src/jdom/rolemanagerclient";
import useServiceClient from "../useServiceClient"
import RoleManagerService from "../RoleManagerService"
import RemoteRequestDeviceView from "../RemoteRequestDeviceView";

// filter out common registers
const ignoreRegisters = [
    SystemReg.StatusCode,
    SystemReg.StreamingPreferredInterval,
    SystemReg.StreamingSamples,
    SystemReg.StreamingInterval
]
const collapsedRegisters = [
    SystemReg.Reading,
    SystemReg.Value,
    SystemReg.Intensity
]

function DashboardService(props: { service: JDService, expanded: boolean }) {
    const { service, expanded } = props;
    const specification = useChange(service, spec => spec.specification);
    const registers = useMemo(() => {
        const packets = specification?.packets;
        let ids = packets
            ?.filter(pkt => isRegister(pkt))
            ?.map(pkt => pkt.identifier) || []
        ids = ids.filter(id => ignoreRegisters.indexOf(id) < 0)
        if (!expanded) // grab the first interresting register
            ids = ids.filter(id => collapsedRegisters.indexOf(id) > -1)
                .slice(0, 1);
        return ids.map(id => service.register(id))
            .filter(reg => !!reg);
    }, [specification, expanded])

    if (!registers?.length)  // nothing to see here
        return null;

    return <AutoGrid spacing={1}>
        {registers.map(register => <RegisterInput key={register.id}
            register={register}
            showServiceName={expanded}
            showRegisterName={expanded || !isReading(register.specification)}
            hideMissingValues={!expanded}
            showTrend={expanded && register.address === SystemReg.Reading}
        />)}
    </AutoGrid>
}

function DashboardDevice(props: {
    device: JDDevice,
    expanded: boolean,
    toggleExpanded: () => void
}) {
    const { device, expanded, toggleExpanded } = props;
    const services = useChange(device, () => device.services()
        .filter(service => service.serviceClass != SRV_CTRL
            && service.serviceClass != SRV_LOGGER
            && !!service.specification));
    const { specification } = useDeviceSpecification(device);
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));
    const roleManagerService = services.find(srv => srv.serviceClass === SRV_ROLE_MANAGER)
    const roleManagerClient = useServiceClient(roleManagerService, srv => new RoleManagerClient(srv));

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
                    {roleManagerClient?.remoteRequestedDevices
                        .map(rdev => <RemoteRequestDeviceView key={rdev.name} rdev={rdev} client={roleManagerClient} />)}
                    {services?.map(service => <Grid item xs={12} key={service.serviceClass}>
                        <DashboardService service={service} expanded={expanded} />
                    </Grid>)}
                </Grid>
            </CardContent>
        </Card>
    );
}

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

export default function Dashboard() {
    const devices = useDevices({ announced: true, ignoreSelf: true })
        .sort(deviceSort);
    const { selected, toggleSelected } = useSelectedNodes()
    const handleExpand = (device: JDDevice) => () => toggleSelected(device)
    const breakpoints = (device: JDDevice): {
        xs?: GridSize,
        md?: GridSize,
        sm?: GridSize,
        lg?: GridSize,
        xl?: GridSize
    } => {
        if (selected(device))
            return { xs: 12, sm: 12, md: 6, lg: 4, xl: 3 };
        else
            return { xs: 12, sm: 6, md: 6, lg: 4, xl: 3 };
    }

    if (!devices.length)
        return <>
            <ConnectAlert />
            <Alert severity="info">Please connect a JACDAC device to use the dashboard.</Alert>
        </>

    return <Grid container spacing={2}>
        {devices?.map(device => <Grid key={device.id} item {...breakpoints(device)}>
            <DashboardDevice device={device} expanded={selected(device)} toggleExpanded={handleExpand(device)} />
        </Grid>)}
    </Grid>
}