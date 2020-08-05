
import React, { useContext } from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import DeviceCard from './DeviceCard';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JacdacContext from '../../../src/react/Context';
import RegisterInput from './RegisterInput';

const useStyles = makeStyles({
    root: {
        marginBottom: "1rem"
    },
});

export default function DeviceList(props: { serviceClass?: number, linkToService?: boolean, registerAddress?: number, showDeviceName?: boolean, showServiceName?: boolean, showRegisterName?: boolean }) {
    const { serviceClass, linkToService, registerAddress, showDeviceName, showServiceName, showRegisterName } = props
    const { bus } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices({ serviceClass }))
    const classes = useStyles()
    const hasServiceClass = serviceClass !== undefined

    return (
        <Grid
            container
            spacing={2}
            className={classes.root}
        >
            {!hasServiceClass && devices.map(device => <Grid key={device.id} item xs={4}><DeviceCard device={device} /></Grid>)}
            {hasServiceClass && devices.map(device => device.services({ serviceClass }).map(service => {
                return <Grid key={service.id} item xs={4}>
                    <ServiceCard service={service} linkToService={linkToService} showDeviceName={showDeviceName} showServiceName={showServiceName} showRegisterName={showRegisterName} registerAddress={registerAddress} />
                </Grid>
            }))}
        </Grid>
    )
}
