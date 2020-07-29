
import React from 'react';
import { ListItem } from '@material-ui/core';
import { JDDevice } from '../../../src/dom/device';
import DeviceCard from './DeviceCard';


const DeviceListItem = (props: { device: JDDevice }) => {
    return <ListItem key={props.device.id}>
        <DeviceCard device={props.device} />
    </ListItem>
}

export default DeviceListItem;