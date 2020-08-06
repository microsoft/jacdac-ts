import React from 'react';
import { JDService } from "../../../src/dom/service";
import { JDDevice } from "../../../src/dom/device";
// tslint:disable-next-line: no-submodule-imports
import { makeStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Card from '@material-ui/core/Card';
// tslint:disable-next-line: no-submodule-imports
import CardContent from '@material-ui/core/CardContent';
// tslint:disable-next-line: no-submodule-imports
import CardMedia from '@material-ui/core/CardMedia';
// tslint:disable-next-line: no-submodule-imports
import IconButton from '@material-ui/core/IconButton';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import { Link } from 'gatsby-theme-material-ui';
import ServiceRegisters from './ServiceRegisters';
import ServiceEvents from './ServiceEvents';
import { isCommand } from '../../../src/dom/spec';
import { CardActions } from '@material-ui/core';
import ServiceCommands from './ServiceCommands';

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
    commandIdentifier?: number
}) {
    const { service, linkToService, registerIdentifier, showDeviceName, showServiceName, showMemberName, eventIdentifier, commandIdentifier } = props;
    const classes = useStyles();

    const hasCommands = service.specification?.packets.some(isCommand)
    const hasRegisterIdentifier = registerIdentifier !== undefined;
    const hasEventIdentifier = eventIdentifier !== undefined
    const hasCommandIdentifier = commandIdentifier !== undefined

    console.log(`has command`, hasCommands)
    return (
        <Card className={classes.root}>
            <CardContent>
                {showServiceName && <Typography className={classes.title} color="textSecondary" gutterBottom>
                    <Link to={linkToService && service.specification ? `/services/${service.specification?.shortId}` : "/clients/web/dom/service"}>{service.name}</Link>
                </Typography>}
                {showDeviceName && <Typography variant="h5" component="h2">
                    <Link to="/clients/web/dom/device">{service.device.name || service.device.shortId}</Link>
                </Typography>}
                <Typography variant="body2" component="p">
                    {(hasRegisterIdentifier || (!hasEventIdentifier && !hasCommandIdentifier)) && <ServiceRegisters service={service} showRegisterName={showMemberName} registerIdentifier={registerIdentifier} />}
                    {((!hasRegisterIdentifier && !hasCommandIdentifier) || hasEventIdentifier) && <ServiceEvents service={service} showEventName={showMemberName} eventIdentifier={eventIdentifier} />}
                </Typography>
            </CardContent>
            {(hasCommands || hasCommandIdentifier) &&
                <CardActions>
                    <ServiceCommands service={service} commandIdentifier={commandIdentifier} />
                </CardActions>}
        </Card>
    );
}
