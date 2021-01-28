import React, { useContext, useEffect } from "react"
import { Button, createMuiTheme, Paper, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import { Grid } from "@material-ui/core";
import { JDDevice } from "../../../../src/jdom/device";
import { isReading, isValueOrIntensity } from "../../../../src/jdom/spec";
import { strcmp } from "../../../../src/jdom/utils";
import useDevices from "../hooks/useDevices";
import useChange from "../../jacdac/useChange";
import { SRV_CTRL, SRV_LOGGER, SRV_ROLE_MANAGER, SRV_SETTINGS } from "../../../../src/jdom/constants";
import DashboardServiceWidget from "../dashboard/DashboardServiceWidget";
import hosts, { addHost } from "../../../../src/hosts/hosts";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import MakeCodeIcon from "../icons/MakeCodeIcon"
import DashboardDeviceItem from "../dashboard/DashboardDeviceItem";

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
        {devices.map(device => <DashboardDeviceItem key={device.id} device={device} />)}
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
