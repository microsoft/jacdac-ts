import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { JDDevice } from '../../../src/dom/device';
import { SRV_CTRL, SRV_LOGGER, ANNOUNCE } from '../../../src/dom/constants';
import ServiceButton from './ServiceButton';
import useChange from '../jacdac/useChange';
import { navigate } from "gatsby";
import { JDService } from '../../../src/dom/service';

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

function navigateToService(service: JDService) {
    const spec = service.specification;
    if (spec)
        navigate(`/services/${spec.shortId}`) // todo spec
}

const DeviceCard = (props: { device: JDDevice, children?: any, onServiceClick?: (service: JDService) => void }) => {
    const { device, children, onServiceClick } = props;
    const classes = useStyles();
    const services = useChange(device, () => device.services()
        .filter(service => service.serviceClass != SRV_CTRL && service.serviceClass != SRV_LOGGER));
    console.log(services)
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
                    {services.map(service => service.name)
                        .join(', ')}
                </Typography>
            </CardContent>
            <CardActions>
                {services.map(service => <ServiceButton service={service} onClick={() => (onServiceClick || navigateToService)(service)} />)}
            </CardActions>
            {children}
        </Card>
    );
}

export default DeviceCard