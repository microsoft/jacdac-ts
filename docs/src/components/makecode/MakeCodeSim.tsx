import React, { useContext, useEffect, useRef } from "react"
import { Button, createMuiTheme, createStyles, IconButton, makeStyles, Paper, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import { Grid } from "@material-ui/core";
import { JDDevice } from "../../../../src/jdom/device";
import { isReading, isValueOrIntensity } from "../../../../src/jdom/spec";
import { arrayConcatMany, strcmp } from "../../../../src/jdom/utils";
import useDevices from "../hooks/useDevices";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
import useChange from "../../jacdac/useChange";
import { SRV_CTRL, SRV_LOGGER } from "../../../../src/jdom/constants";
import DashboardServiceWidget from "../dashboard/DashboardServiceWidget";
import hosts, { addHost } from "../../../../src/hosts/hosts";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";

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


const ignoredServices = [
    SRV_CTRL,
    SRV_LOGGER
]

function carouselServices(device: JDDevice) {
    return device?.services()
        .filter(service => ignoredServices.indexOf(service.serviceClass) < 0
            && !!service.specification);
}

function CarouselItem(props: {
    device: JDDevice,
}) {
    const { device } = props;
    const services = useChange(device, d => carouselServices(d));

    return <Grid item>
        <Paper>
            <Grid container spacing={1} direction="row" justify="center" alignItems="center" alignContent="stretch">
                {services?.map(service => <Grid key={"widget" + service.service_index} item>
                    <DashboardServiceWidget
                        service={service}
                        expanded={false}
                        variant="icon"
                        services={services} />
                </Grid>)}
            </Grid>
        </Paper>
    </Grid>
}

function Carousel() {
    const devices = useDevices({ announced: true, ignoreSelf: true })
        .sort(deviceSort);
    const handleAdd = () => {
        console.log("add")
        // send message to makecode
        window.parent.postMessage({
            type: "extensionsdialog",
            query: "jacdac",
            broadcast: true
        }, "*")
    }

    return <Grid container spacing={1}>
        {devices.map(device => {
            return <CarouselItem key={device.id} device={device} />
        })}
        <Grid item>
            <Button size="medium" color="primary" variant="contained" startIcon={<AddIcon />}
                onClick={handleAdd} aria-label={"Add blocks"}>Add</Button>
        </Grid>
    </Grid>
}

export default function Page() {
    const { bus } = useContext<JDContextProps>(JACDACContext);
    const rawTheme = createMuiTheme({
        palette: {
            primary: {
                main: '#2e7d32',
            },
            secondary: {
                main: '#ffc400',
            },
        }
    })
    const theme = responsiveFontSizes(rawTheme);
    useEffect(() => {
        const hostDefinitions = hosts();
        for (const hostDef of hostDefinitions.slice(0, 3)) {
            addHost(bus, hostDef.services());
        }
    }, []);

    return <ThemedLayout theme={theme}>
        <Carousel />
    </ThemedLayout>
}
