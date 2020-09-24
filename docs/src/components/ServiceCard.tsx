import React from 'react';
import { JDService } from "../../../src/dom/service";
// tslint:disable-next-line: no-submodule-imports
import { makeStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Card from '@material-ui/core/Card';
// tslint:disable-next-line: no-submodule-imports
import CardContent from '@material-ui/core/CardContent';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import { Link } from 'gatsby-theme-material-ui';
import ServiceRegisters from './ServiceRegisters';
import ServiceEvents from './ServiceEvents';
import { isCommand } from '../../../src/dom/spec';
import { CardActions } from '@material-ui/core';
import ServiceCommands from './ServiceCommands';
import DeviceCardHeader from './DeviceCardHeader';
import { DeviceLostAlert } from './DeviceLostAlert';

const useStyles = makeStyles({
    root: {
        minWidth: 275,
    },
    bullet: {
        display: 'inline-block',
        margin: '0 2px',
        transform: 'scale(0.8)',
    },
    title: {
        fontSize: 14,
    },
    pos: {
        marginBottom: 12,
    },
});

export default function ServiceCard(props: {
    service: JDService,
    linkToService?: boolean,
    registerIdentifier?: number,
    showDeviceName?: boolean,
    showServiceName?: boolean,
    showMemberName?: boolean,
    eventIdentifier?: number,
    commandIdentifier?: number,
    commandArgs?: any[]
}) {
    const { service, linkToService, registerIdentifier, showDeviceName, 
        showServiceName, showMemberName, eventIdentifier, commandIdentifier, commandArgs } = props;
    const classes = useStyles();

    const hasCommands = service.specification?.packets.some(isCommand)
    const hasRegisterIdentifier = registerIdentifier !== undefined;
    const hasEventIdentifier = eventIdentifier !== undefined
    const hasCommandIdentifier = commandIdentifier !== undefined

    return (
        <Card className={classes.root}>
            <DeviceCardHeader device={service.device} />
            <CardContent>
                {showServiceName && <Typography className={classes.title} color="textSecondary" gutterBottom>
                    <Link to={linkToService && service.specification ? `/services/${service.specification?.shortId}` : "/clients/web/dom/service"}>{service.name}</Link>
                </Typography>}
                <Typography variant="body2" component="div">
                    {(hasRegisterIdentifier || (!hasEventIdentifier && !hasCommandIdentifier)) && <ServiceRegisters service={service} showRegisterName={showMemberName} registerIdentifier={registerIdentifier} />}
                    {((!hasRegisterIdentifier && !hasCommandIdentifier) || hasEventIdentifier) && <ServiceEvents service={service} showEventName={showMemberName} eventIdentifier={eventIdentifier} />}
                </Typography>
                <DeviceLostAlert device={service?.device} />
            </CardContent>
            {(hasCommands || hasCommandIdentifier) && (!hasRegisterIdentifier && !hasEventIdentifier) &&
                <CardActions>
                    <ServiceCommands service={service} commandIdentifier={commandIdentifier} commandArgs={commandArgs} />
                </CardActions>}
        </Card>
    );
}
