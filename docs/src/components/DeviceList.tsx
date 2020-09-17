
import React, { useContext } from 'react';
import { Grid, makeStyles, Theme, createStyles } from '@material-ui/core';
import DeviceCard from './DeviceCard';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import useGridBreakpoints from './useGridBreakpoints';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
}))

export default function DeviceList(props: {
    serviceClass?: number,
    linkToService?: boolean,
    registerIdentifier?: number,
    eventIdentifier?: number,
    commandIdentifier?: number,
    showDeviceName?: boolean,
    showServiceName?: boolean,
    showRegisterName?: boolean,
    showTemperature?: boolean,
    showFirmware?: boolean
}) {
    const { serviceClass, linkToService, registerIdentifier,
        showDeviceName, showServiceName, showRegisterName, showFirmware, showTemperature,
        eventIdentifier, commandIdentifier } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const gridBreakpoints = useGridBreakpoints()
    const devices = useChange(bus, n => n.devices({ serviceClass }))
    const classes = useStyles()
    const hasServiceClass = serviceClass !== undefined

    return (
        <Grid
            container
            spacing={2}
            className={classes.root}
        >
            {!hasServiceClass && devices.map(device => <Grid key={device.id} item {...gridBreakpoints}>
                <DeviceCard
                    device={device}
                    showDescription={true}
                    showTemperature={showTemperature}
                    showFirmware={showFirmware}
                />
            </Grid>)}
            {hasServiceClass && devices.map(device => device.services({ serviceClass }).map(service => {
                return <Grid key={service.id} item {...gridBreakpoints}>
                    <ServiceCard service={service}
                        linkToService={linkToService}
                        showDeviceName={showDeviceName}
                        showServiceName={showServiceName}
                        showMemberName={showRegisterName}
                        registerIdentifier={registerIdentifier}
                        eventIdentifier={eventIdentifier}
                        commandIdentifier={commandIdentifier}
                    />
                </Grid>
            }))}
        </Grid>
    )
}
