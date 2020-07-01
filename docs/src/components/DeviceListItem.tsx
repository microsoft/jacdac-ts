
import React from 'react';
import { ListItem } from '@material-ui/core';
import { Device } from '../../../src/dom/device';
import DeviceCard from './DeviceCard';


const DeviceListItem = (props: { device: Device }) => {
    return <ListItem key={props.device.id}>
        <DeviceCard device={props.device} />
    </ListItem>
}

export default DeviceListItem;