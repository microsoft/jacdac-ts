import React, { useContext, useEffect } from "react"
import { Button, createMuiTheme, createStyles, IconButton, makeStyles, Paper, responsiveFontSizes } from "@material-ui/core";
import ThemedLayout from "../../components/ui/ThemedLayout";
import { Grid } from "@material-ui/core";
import { JDDevice } from "../../../../src/jdom/device";
import { isReading, isValueOrIntensity } from "../../../../src/jdom/spec";
import { arrayConcatMany, strcmp } from "../../../../src/jdom/utils";
import useDevices from "../hooks/useDevices";
import AddIcon from '@material-ui/icons/Add';
import useChange from "../../jacdac/useChange";
import { SRV_CTRL, SRV_LOGGER } from "../../../../src/jdom/constants";
import DashboardServiceWidget from "../dashboard/DashboardServiceWidget";
import hosts, { addHost } from "../../../../src/hosts/hosts";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        display: "grid",
        gridAutoFlow: "column",
        gridTemplateRows: "repeat(3, 20vw)",
        gridGap: theme.spacing(1),
        overflowX: "auto",
        overflowY: "hidden"
    },
    item: {
        height: "20vw",
        margin: 0,
        padding: 0
    },
    services: {
        height: "100%",
    }
}));

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
    column: number,
    columnSpan: number
}) {
    const { device, column, columnSpan } = props;
    const classes = useStyles();
    const services = useChange(device, d => carouselServices(d));

    return <div className={classes.item} style={{
        gridColumnStart: columnSpan > 1 ? column + 1 : undefined,
        gridColumnEnd: columnSpan > 1 ? column + 1 + columnSpan : undefined
    }}>
        <Paper style={{ height: "100%", width: "100%", }}>
            <Grid container className={classes.services} direction="row" spacing={1} justify="center" alignItems="center" alignContent="stretch">
                {services?.map(service => <Grid key={"widget" + service.service_index} item>
                    <DashboardServiceWidget
                        service={service}
                        expanded={false}
                        variant="icon"
                        services={services} />
                </Grid>)}
            </Grid>
        </Paper>
    </div>;
}

function Carousel() {
    const devices = useDevices({ announced: true, ignoreSelf: true })
        .sort(deviceSort);
    const classes = useStyles();
    const services = arrayConcatMany(devices.map(carouselServices));
    const rows = 3;
    const columns = Math.ceil(services.length / rows);
    const width = (columns * 20) + `vw`

    let column = 0;
    return <div className={classes.root} style={{ width, gridTemplateColumns: `repeat(${columns}, 20vw)` }}>
        {devices.map(device => {
            const dsrvs = carouselServices(device);
            const col = column;
            const span = dsrvs.length;
            column = (column + span) % columns;
            //console.log({ col, span })
            return <CarouselItem key={device.id} device={device} column={col} columnSpan={span} />
        })}
        <div key="add" className={classes.item} style={{ gridColumnStart: columns, gridRowStart: rows }}>
            <Grid container justify="center" alignItems="center">
                <Button size="medium" color="primary" variant="contained" startIcon={<AddIcon />}>Add</Button>
            </Grid>
        </div>
    </div>
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
