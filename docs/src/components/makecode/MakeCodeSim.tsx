import React, { useContext, useEffect } from "react"
import { Button, createMuiTheme, Paper, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import { Grid } from "@material-ui/core";
import { JDDevice } from "../../../../src/jdom/device";
import { isReading, isValueOrIntensity, resolveMakecodeServiceFromClassIdentifier } from "../../../../src/jdom/spec";
import { strcmp } from "../../../../src/jdom/utils";
import useDevices from "../hooks/useDevices";
import useChange from "../../jacdac/useChange";
import { SRV_CONTROL, SRV_CTRL, SRV_LOGGER, SRV_ROLE_MANAGER, SRV_SETTINGS } from "../../../../src/jdom/constants";
import DashboardServiceWidget from "../dashboard/DashboardServiceWidget";
import hosts, { addHost } from "../../../../src/hosts/hosts";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import MakeCodeIcon from "../icons/MakeCodeIcon"
import DashboardDeviceItem from "../dashboard/DashboardDeviceItem";
import Helmet from "react-helmet"

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

function Carousel() {
    const devices = useDevices({ announced: true, ignoreSelf: true })
        // ignore MakeCode device (role manager)
        .filter(device => device.serviceClasses.indexOf(SRV_ROLE_MANAGER) < 0)
        // show best in front
        .sort(deviceSort);
    const handleAdd = () => {
        // list all devices connected to the bus
        // and query for them, let makecode show the missing ones
        const query = devices.map(device => device.services()
            .map(srv => resolveMakecodeServiceFromClassIdentifier(srv.serviceClass))
            .map(info => info?.client.repo)
            .filter(repo => !!repo)
            .join('|')
        ).filter(q => !!q).join('|');
        // send message to makecode
        window.parent.postMessage({
            type: "extensionsdialog",
            query: query || "jacdac",
            broadcast: true
        }, "*")
    }

    return <Grid container spacing={1}>
        {devices.map(device => <DashboardDeviceItem key={device.id}
            device={device} variant="icon" showAvatar={false} />)}
        <Grid item>
            <Button size="medium" color="primary" variant="contained" startIcon={<MakeCodeIcon />}
                onClick={handleAdd} aria-label={"Add blocks"}>Add blocks</Button>
        </Grid>
    </Grid>
}

export default function Page() {
    const { bus } = useContext<JDContextProps>(JACDACContext);
    const rawTheme = createMuiTheme({
        palette: {
            primary: {
                main: '#63c',
            },
            secondary: {
                main: '#ffc400',
            },
            contrastThreshold: 5.1,
            type: "dark"
        },
    })
    const theme = responsiveFontSizes(rawTheme);
    useEffect(() => {
        const hostDefinitions = hosts();
        for (const hostDef of hostDefinitions.slice(0, 20)) {
            addHost(bus, hostDef.services());
        }
    }, []);

    return <ThemedLayout theme={theme}>
        <Helmet>
            <style>
                {`
html {
    margin-right: 4px;
    overflow-y: auto !important;
}
html, body {
    background: transparent !important;
}
`}
            </style>
        </Helmet>
        <Carousel />
    </ThemedLayout>
}
