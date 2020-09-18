
import React, { useContext } from 'react';
import { Grid, makeStyles, Theme, createStyles, CardContent, Card, CardActions, Switch } from '@material-ui/core';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import useGridBreakpoints from './useGridBreakpoints';
import DeviceCardHeader from './DeviceCardHeader';
import { JDService } from '../../../src/dom/service';
import { DeviceLostAlert } from './DeviceLostAlert';
import { JDDevice } from '../../../src/dom/device';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
}))

function ServiceListItem(props: {
    service: JDService,
    children?: any,
    checked?: boolean,
    checkedDisabled?: boolean
    toggleChecked?: () => void
}) {
    const { service, children, checked, checkedDisabled, toggleChecked } = props;
    const { device } = service;

    const handleCheck = () => toggleChecked()

    return <Card>
        <DeviceCardHeader device={device} />
        <CardContent>
            <DeviceLostAlert device={device} />
            {children}
        </CardContent>
        <CardActions>
            {checked !== undefined && <Switch disabled={checkedDisabled} onChange={handleCheck} checked={checked} />}
        </CardActions>
    </Card>
}

export default function ServiceList(props: {
    serviceClass: number,
    selected?: (service: JDService) => boolean,
    toggleSelected?: (service: JDService) => void
}) {
    const { serviceClass, selected, toggleSelected } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const gridBreakpoints = useGridBreakpoints()
    const services = useChange(bus, n => n.services({ serviceClass }))
    const classes = useStyles()

    const handleChecked = (service: JDService) => () => toggleSelected(service)

    return (
        <Grid container spacing={2} className={classes.root}>
            {services?.map(service => <Grid key={service.id} item {...gridBreakpoints}>
                <ServiceListItem service={service} checked={selected(service)} toggleChecked={handleChecked(service)} />
            </Grid>)}
        </Grid>
    )
}
