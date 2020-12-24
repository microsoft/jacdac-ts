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
    commandArgs?: any[],
    showDeviceName?: boolean,
    showServiceName?: boolean,
    showMemberName?: boolean,
    showTemperature?: boolean,
    showFirmware?: boolean
}) {
    const { serviceClass, linkToService, registerIdentifier,
        showDeviceName, showServiceName, showMemberName, showFirmware, showTemperature,
        eventIdentifier, commandIdentifier, commandArgs } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, n => n.devices({ serviceClass }))
    const services = useChange(bus, n => n.services({ serviceClass }))
    const classes = useStyles()
    const hasServiceClass = serviceClass !== undefined
    const gridBreakpoints = useGridBreakpoints(devices?.length)

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
            {hasServiceClass && services.map(service => {
                return <Grid key={service.id} item {...gridBreakpoints}>
                    <ServiceCard service={service}
                        linkToService={linkToService}
                        showDeviceName={showDeviceName}
                        showServiceName={showServiceName}
                        showMemberName={showMemberName}
                        registerIdentifier={registerIdentifier}
                        eventIdentifier={eventIdentifier}
                        commandIdentifier={commandIdentifier}
                        commandArgs={commandArgs}
                    />
                </Grid>
            })}
        </Grid>
    )
}
