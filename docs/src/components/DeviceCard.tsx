import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { Device } from '../../../src/dom/device';
import { Packet } from '../../../src/dom/packet';
import { SRV_CTRL, SRV_LOGGER, ANNOUNCE } from '../../../src/dom/constants';
import useEventSubscription from '../jacdac/useEventSubscription';
import ServiceButton from './ServiceButton';
import useChange from '../jacdac/useChange';

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

const DeviceCard = (props: { device: Device, children?: any }) => {
    const { device, children } = props;
    const classes = useStyles();
    const services = device.services()
        .filter(service => service.serviceClass != SRV_CTRL && service.serviceClass != SRV_LOGGER);
    return (
        <Card className={classes.root}>
            <CardContent>
                <Typography className={classes.title} color="textSecondary" gutterBottom>
                    {device.deviceId}
                </Typography>
                <Typography variant="h5" component="h2">
                    {device.shortId}
                </Typography>
                <Typography variant="body2" component="p">
                    {device.services()
                        .filter(service => service.serviceClass != SRV_CTRL && service.serviceClass != SRV_LOGGER)
                        .map(service => service.name)
                        .join(', ')}
                </Typography>
            </CardContent>
            <CardActions>
                {services.map(service => <ServiceButton service={service} />)}
            </CardActions>
            {children}
        </Card>
    );
}

export default DeviceCard