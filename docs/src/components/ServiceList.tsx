
import React, { useContext } from 'react';
import { Grid, makeStyles, Theme, createStyles, CardContent, Card, CardActions, Switch, Box } from '@material-ui/core';
import ServiceCard from './ServiceCard';
import useChange from '../jacdac/useChange';
import JacdacContext, { JDContextProps } from '../../../src/react/Context';
import useGridBreakpoints from './useGridBreakpoints';
import DeviceCardHeader from './DeviceCardHeader';
import { JDService } from '../../../src/jdom/service';
import { DeviceLostAlert } from './alert/DeviceLostAlert';
import { JDDevice } from '../../../src/jdom/device';
import Alert from './ui/Alert';


function ServiceListItem(props: {
    service: JDService,
    content?: JSX.Element | JSX.Element[],
    checked?: boolean,
    checkedDisabled?: boolean
    toggleChecked?: () => void,
    actions?: JSX.Element | JSX.Element[]
}) {
    const { service, content, checked, checkedDisabled, toggleChecked, actions } = props;
    const { device } = service;

    const handleCheck = () => toggleChecked()

    return <Card>
        <DeviceCardHeader device={device} showMedia={true} />
        <CardContent>
            <DeviceLostAlert device={device} />
            {content}
        </CardContent>
        <CardActions>
            {checked !== undefined && <Switch disabled={checkedDisabled} onChange={handleCheck} checked={checked} />}
            {actions}
        </CardActions>
    </Card>
}

export default function ServiceList(props: {
    serviceClass: number,
    selected?: (service: JDService) => boolean,
    toggleSelected?: (service: JDService) => void,
    content?: (service: JDService) => JSX.Element | JSX.Element[],
    actions?: (service: JDService) => JSX.Element | JSX.Element[],
    alertMissing?: string
}) {
    const { serviceClass, selected, toggleSelected, content, actions, alertMissing } = props
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const services = useChange(bus, n => n.services({ serviceClass }))
    const gridBreakpoints = useGridBreakpoints(services?.length)

    const handleSelected = (service: JDService) => selected && selected(service)
    const handleChecked = (service: JDService) => () => toggleSelected && toggleSelected(service);
    const serviceContent = (service: JDService) => content && content(service);
    const serviceActions = (service: JDService) => actions && actions(service);

    if (alertMissing && !services?.length)
        return <Alert severity="info">{alertMissing}</Alert>

    return (<Box mb={1}>
        <Grid container spacing={2}>
            {services?.map(service => <Grid key={service.id} item {...gridBreakpoints}>
                <ServiceListItem
                    service={service}
                    checked={handleSelected(service)}
                    toggleChecked={handleChecked(service)}
                    content={serviceContent(service)}
                    actions={serviceActions(service)}
                />
            </Grid>)}
        </Grid></Box>
    )
}
