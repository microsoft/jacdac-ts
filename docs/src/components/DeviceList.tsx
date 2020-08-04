
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

export default function DeviceList(props: { serviceClass?: number, linkToService?: boolean, registerAddress?: number }) {
    const { serviceClass, linkToService, registerAddress } = props
    const { bus } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices({ serviceClass }))
    const classes = useStyles()
    const hasServiceClass = serviceClass !== undefined
    const hasRegisterAddress = registerAddress !== undefined

    return (
        <Grid
            container
            spacing={2}
            className={classes.root}
        >
            {!hasServiceClass && devices.map(device => <Grid key={device.id} item xs={4}><DeviceCard device={device} /></Grid>)}
            {hasServiceClass && devices.map(device => device.services({ serviceClass }).map(service => {
                return <Grid key={service.id} item xs={4}>
                    {!hasRegisterAddress && <ServiceCard service={service} linkToService={linkToService} />}
                    {hasRegisterAddress && <RegisterInput register={service.register(registerAddress)} showName={false} />}
                </Grid>
            }))}
        </Grid>
    )
}
