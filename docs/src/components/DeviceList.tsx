
import React, { useContext } from 'react';
import { Grid } from '@material-ui/core';
import DeviceCard from './DeviceCard';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JacdacContext from '../../../src/react/Context';

export default function DeviceList(props: { serviceClass?: number, linkToService?: boolean }) {
    const { serviceClass, linkToService } = props
    const { bus } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices({ serviceClass }))

    return (
        <Grid
            container
            spacing={2}
        >
            {serviceClass === undefined && devices.map(device => <Grid key={device.id} item xs={4}><DeviceCard device={device} /></Grid>)}
            {!!serviceClass && devices.map(device => device.services({ serviceClass }).map(service => <Grid key={service.id} item xs={4}><ServiceCard service={service} linkToService={linkToService} /></Grid>))}
        </Grid>
    )
}
