import React, { useEffect, useState, Fragment } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Card from '@material-ui/core/Card';
// tslint:disable-next-line: no-submodule-imports
import CardContent from '@material-ui/core/CardContent';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import { JDDevice } from '../../../src/dom/device';
import { SRV_CTRL, SRV_LOGGER, CtrlReg } from '../../../src/dom/constants';
import ServiceButton from './ServiceButton';
import useChange from '../jacdac/useChange';
import { navigate } from "gatsby";
import { JDService } from '../../../src/dom/service';
import { CardActions, CardMedia, createStyles, Theme } from '@material-ui/core';
import DeviceCardHeader from './DeviceCardHeader';
import useRegisterValue from '../jacdac/useRegisterValue';
import { DeviceLostAlert } from './DeviceLostAlert';
import { deviceSpecificationFromClassIdenfitier, imageDeviceOf } from '../../../src/dom/spec';
import CardMediaWithSkeleton from "./CardMediaWithSkeleton"

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
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
    media: {
        height: 0,
        paddingTop: '18%',
    }
}));

function navigateToService(service: JDService) {
    const spec = service.specification;
    if (spec)
        navigate(`/services/${spec.shortId}`) // todo spec
}

function DeviceDescription(props: { device: JDDevice }) {
    const { device } = props;
    const register = useRegisterValue(device, 0, CtrlReg.DeviceDescription)
    return <span>{register?.stringValue || ""}</span>
}

export default function DeviceCard(props: {
    device: JDDevice,
    children?: any,
    action?: JSX.Element | JSX.Element[],
    content?: JSX.Element | JSX.Element[],
    onServiceClick?: (service: JDService) => void,
    showTemperature?: boolean,
    showFirmware?: boolean,
    showDescription?: boolean
}) {
    const { device, children, action, content, onServiceClick,
        showDescription, showTemperature, showFirmware } = props;
    const classes = useStyles();
    const services = useChange(device, () => device.services()
        .filter(service => service.serviceClass != SRV_CTRL && service.serviceClass != SRV_LOGGER));
    const deviceClass = useRegisterValue(device, SRV_CTRL, CtrlReg.DeviceClass);
    const deviceSpecification = deviceSpecificationFromClassIdenfitier(deviceClass?.intValue);
    const imageUrl = imageDeviceOf(deviceSpecification);
    console.log('fw', deviceClass, deviceSpecification)

    return (
        <Card className={classes.root}>
            <CardMediaWithSkeleton
                className={classes.media}
                image={imageUrl}
                title={deviceSpecification?.name}
            />
            <DeviceCardHeader device={device} showTemperature={showTemperature} showFirmware={showFirmware} />
            {(showDescription || content) &&
                <CardContent>
                    {<DeviceLostAlert device={device} />}
                    {showDescription && <DeviceDescription device={device} />}
                    {content}
                </CardContent>}
            <CardActions>
                {action || services.map(service => <ServiceButton key={service.id} service={service} onClick={() => (onServiceClick || navigateToService)(service)} />)}
            </CardActions>
            {children}
        </Card>
    );
}
