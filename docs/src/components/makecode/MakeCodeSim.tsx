import React, { useContext, useEffect } from "react"
import { Button, createMuiTheme, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import { Grid } from "@material-ui/core";
import { JDDevice } from "../../../../src/jdom/device";
import { isReading, isValueOrIntensity, makeCodeServices, resolveMakecodeServiceFromClassIdentifier } from "../../../../src/jdom/spec";
import { arrayConcatMany, strcmp, unique } from "../../../../src/jdom/utils";
import useDevices from "../hooks/useDevices";
import { SRV_ROLE_MANAGER } from "../../../../src/jdom/constants";
import hosts, { addHost } from "../../../../src/hosts/hosts";
import JacdacContext, { JacdacContextProps } from "../../jacdac/Context";
import MakeCodeIcon from "../icons/MakeCodeIcon"
import DashboardDeviceItem from "../dashboard/DashboardDeviceItem";
import Helmet from "react-helmet"
import Flags from "../../../../src/jdom/flags";
import DarkModeContext from "../ui/DarkModeContext";
import KindIcon from "../KindIcon";
import AppContext from "../AppContext";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";

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

function Carousel() {
    const { toggleShowDeviceHostsDialog } = useContext(AppContext)
    const devices = useDevices({ announced: true, ignoreSelf: true })
        // ignore MakeCode device (role manager)
        .filter(device => device.serviceClasses.indexOf(SRV_ROLE_MANAGER) < 0)
        // show best in front
        .sort(deviceSort);
    const handleAdd = () => {
        // list all devices connected to the bus
        // and query for them, let makecode show the missing ones
        const query = unique(
            arrayConcatMany(
                devices.map(device => device.services()
                    .map(srv => resolveMakecodeServiceFromClassIdentifier(srv.serviceClass))
                    .map(info => info?.client.repo)
                    .filter(q => !!q)
                )
            )
        ).join('|');
        // send message to makecode
        window.parent.postMessage({
            type: "extensionsdialog",
            query: query || `jacdac|${makeCodeServices().map(info => info?.client.repo).filter(r => !!r).join("|")}`,
            broadcast: true
        }, "*")
    }

    return <Grid container alignItems="flex-start" spacing={1}>
        {devices.map(device => <DashboardDeviceItem key={device.id}
            device={device} variant="icon" showAvatar={false} />)}
        <Grid item>
            <Button size="medium" variant="contained" startIcon={<KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} />}
                onClick={toggleShowDeviceHostsDialog} aria-label={"Start Simulator"}>Start simulator</Button>
        </Grid>
        <Grid item>
            <Button size="medium" color="primary" variant="contained" startIcon={<MakeCodeIcon />}
                onClick={handleAdd} aria-label={"Add blocks"}>Add blocks</Button>
        </Grid>
    </Grid>
}

export default function Page() {
    const { bus } = useContext<JacdacContextProps>(JacdacContext);
    const { toggleDarkMode } = useContext(DarkModeContext);
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

    useEffect(() => toggleDarkMode('dark'), []); // always dark mode

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
