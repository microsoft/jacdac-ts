import React, { useContext } from 'react';
import { createStyles, makeStyles, Theme, Grid } from '@material-ui/core';
import AppContext, { DrawerType } from './AppContext';
import useLocalStorage from './useLocalStorage';
import DeviceSpecificationSource from "./DeviceSpecificationSource"
import { clone } from '../../../src/jdom/utils';
import DeviceSpecificationForm from './DeviceSpecificationForm';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    segment: {
        marginBottom: theme.spacing(2)
    },
    editor: {
    },
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap",
        flexGrow: 1
    }
}));

export default function DeviceDesigner() {
    const classes = useStyles();
    const { drawerType } = useContext(AppContext)
    const { value: device, setValue: setDevice } = useLocalStorage<jdspec.DeviceSpec>('jacdac:devicedesigner;2',
        {
            name: "My device",
            services: [],
            firmwares: [],
            repo: ""
        } as jdspec.DeviceSpec)
    const drawerOpen = drawerType != DrawerType.None
    const updateDevice = () => {
        setDevice(clone(device));
    }
    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 7}>
                <DeviceSpecificationForm device={device} updateDevice={updateDevice} />
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                <DeviceSpecificationSource deviceSpecification={device} showJSON={true} showMarkdown={true} showDTDL={true} />
            </Grid>
        </Grid>
    );
}
