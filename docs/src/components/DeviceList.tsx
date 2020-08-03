
import React, { useContext } from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import DeviceCard from './DeviceCard';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JacdacContext from '../../../src/react/Context';

const useStyles = makeStyles({
    root: {
      marginBottom: "1rem"
    },
});

export default function DeviceList(props: { serviceClass?: number, linkToService?: boolean }) {
    const { serviceClass, linkToService } = props
    const { bus } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices({ serviceClass }))
    const classes = useStyles()

    return (
        <Grid
            container
            spacing={2}
            className={classes.root}
        >
            {serviceClass === undefined && devices.map(device => <Grid key={device.id} item xs={4}><DeviceCard device={device} /></Grid>)}
            {!!serviceClass && devices.map(device => device.services({ serviceClass }).map(service => <Grid key={service.id} item xs={4}><ServiceCard service={service} linkToService={linkToService} /></Grid>))}
        </Grid>
    )
}
