import { Card, CardContent, Grid } from "@material-ui/core";
import React, { useContext } from "react";
import { SRV_CTRL, SRV_LOGGER, SystemReg } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";
import { JDService } from "../../../../src/jdom/service";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import useChange from "../../jacdac/useChange";
import DeviceCardHeader from "../DeviceCardHeader";
import useGridBreakpoints from "../useGridBreakpoints";
import ServiceRegisters from "../ServiceRegisters"
import { JDRegister } from "../../../../src/jdom/register";

function DashboardService(props: { service: JDService }) {
    const { service } = props;

    // filter out common registers
    const filter = (reg: JDRegister) => {
        const r = reg.address !== SystemReg.StatusCode
            && reg.address !== SystemReg.StreamingPreferredInterval
            && reg.address !== SystemReg.StreamingSamples
            && reg.address !== SystemReg.StreamingInterval;
        return r;
    }

    return <ServiceRegisters
        service={service}
        showRegisterName={true}
        filter={filter}
        hideMissingValues={true}
    />
}

function DashboardDevice(props: {
    device: JDDevice,
}) {
    const { device } = props;
    const services = useChange(device, () => device.services()
        .filter(service => service.serviceClass != SRV_CTRL
            && service.serviceClass != SRV_LOGGER
            && !!service.specification))

    return (
        <Card>
            <DeviceCardHeader hideDeviceId={true} device={device} />
            <CardContent>
                <Grid container>
                    {services?.map(service => <Grid item xs={12} key={service.serviceClass}>
                        <DashboardService service={service} />
                    </Grid>)}
                </Grid>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, b => b.devices());
    const gridBreakpoints = useGridBreakpoints(devices?.length)

    return <Grid container spacing={2}>
        {devices?.map(device => <Grid key={device.id} item {...gridBreakpoints}>
            <DashboardDevice device={device} />
        </Grid>)}
    </Grid>
}