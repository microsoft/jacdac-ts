import React, { useContext } from 'react';
import { createStyles, makeStyles, Theme, Grid } from '@material-ui/core';
import AppContext, { DrawerType } from './AppContext';
import useLocalStorage from './useLocalStorage';
import { clone } from '../../../src/jdom/utils';
import ModuleSpecificationForm from './ModuleSpecificationForm';

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
    return <ModuleSpecificationForm device={device} updateDevice={updateDevice} />;
}
