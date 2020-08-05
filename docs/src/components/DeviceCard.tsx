import React, { useEffect, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Card from '@material-ui/core/Card';
// tslint:disable-next-line: no-submodule-imports
import CardActions from '@material-ui/core/CardActions';
// tslint:disable-next-line: no-submodule-imports
import CardContent from '@material-ui/core/CardContent';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import { JDDevice } from '../../../src/dom/device';
import { CtrlReg, SRV_CTRL, SRV_LOGGER, ANNOUNCE } from '../../../src/dom/constants';
import ServiceButton from './ServiceButton';
import useChange from '../jacdac/useChange';
import { navigate } from "gatsby";
import { JDService } from '../../../src/dom/service';
import { debouncedPollAsync } from '../../../src/dom/utils';

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
    }
});

function navigateToService(service: JDService) {
    const spec = service.specification;
    if (spec)
        navigate(`/services/${spec.shortId}`) // todo spec
}

export default function DeviceCard(props: { device: JDDevice, children?: any, onServiceClick?: (service: JDService) => void }) {
    const { device, children, onServiceClick } = props;
    const classes = useStyles();
    const services = useChange(device, () => device.services()
        .filter(service => service.serviceClass != SRV_CTRL && service.serviceClass != SRV_LOGGER));
    const controlService = useChange(device, () => device.service(SRV_CTRL))

    const firmwareRegister = controlService?.register(CtrlReg.FirmwareVersion);
    const tempRegister = controlService?.register(CtrlReg.Temperature)
    const firmware = firmwareRegister?.stringValue || "";
    const [temperature, setTemperature] = useState<number>(tempRegister?.intValue || undefined)
/*    useEffect(() => debouncedPollAsync(async () => {
        console.log(`poll temperature ${temperature}`)
        if (!firmwareRegister?.data)
            await firmwareRegister?.sendGetAsync()
        await tempRegister?.sendGetAsync()
        setTemperature(tempRegister?.intValue || undefined)
    }), [controlService])
*/
    return (
        <Card className={classes.root}>
            <CardContent>
                <Typography className={classes.title} color="textSecondary" gutterBottom>
                    {device.deviceId}
                    {firmware !== undefined && `v${firmware}`}
                    {temperature !== undefined && `${temperature}°`}
                </Typography>
                <Typography variant="h5" component="h2">
                    {device.name}
                </Typography>
            </CardContent>
            <CardActions>
                {services.map(service => <ServiceButton key={service.id} service={service} onClick={() => (onServiceClick || navigateToService)(service)} />)}
            </CardActions>
            {children}
        </Card>
    );
}
