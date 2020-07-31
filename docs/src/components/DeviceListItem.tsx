
import React from 'react';
import { ListItem } from '@material-ui/core';
import { JDDevice } from '../../../src/dom/device';
import DeviceCard from './DeviceCard';


export default function DeviceListItem(props: { device: JDDevice }) {
    return <ListItem key={props.device.id}>
        <DeviceCard device={props.device} />
    </ListItem>
}
