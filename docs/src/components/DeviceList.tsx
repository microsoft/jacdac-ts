
import React, { useContext } from 'react';
import { ListItem, ListItemText, Grid } from '@material-ui/core';
import DeviceCard from './DeviceCard';
import useChange from '../jacdac/useChange';
import { BusState } from '../../../src/dom/bus';
import JacdacContext from '../../../src/react/Context';

const DeviceList = (props: { serviceClass?: number }) => {
    const { bus, connectionState } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices({ serviceClass: props.serviceClass }))

    console.log(devices)
    return (
        <Grid
            container
            spacing={2}
        >
            {connectionState == BusState.Connected && !devices.length && <ListItem><ListItemText primary="No device detected..." /></ListItem>}
            {devices.map(device => <Grid item xs={4}><DeviceCard device={device} /></Grid>)}
            {connectionState == BusState.Disconnected && <ListItem><ListItemText primary="Connect to see devices" /></ListItem>}
        </Grid>
    )

}

export default DeviceList