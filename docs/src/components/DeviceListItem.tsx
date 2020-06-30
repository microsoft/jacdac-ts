
import React, { useState } from 'react';
import { ListItem, ListItemText } from '@material-ui/core';
import { Device } from '../../../src/dom/device';


const DeviceListItem = (props: { device: Device }) => {
    return <ListItem key={props.device.id}>
        <ListItemText primary={props.device.shortId} />
    </ListItem>
}

export default DeviceListItem;