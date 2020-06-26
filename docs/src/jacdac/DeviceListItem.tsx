
import React from 'react';
import { ListItem, ListItemText } from '@material-ui/core';
import { Device } from '../../../src/device';


const DeviceListItem = (props: { device: Device }) => <ListItem>
    <ListItemText primary={props.device.shortId} secondary={props.device.serviceLength} />
</ListItem>

export default DeviceListItem;