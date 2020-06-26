
import React from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/device";
import { useQuery } from './Query';
import { jdql } from '../../../src/graphql';

const DeviceList = () => {
    const { loading, error, data } = useQuery<Device[]>(`{
        devices {
            deviceId
            shortId
        }
    }`)
    return (
        <List component="nav" aria-label="devices">
            {loading && <ListItem><ListItemText primary="loading..." /></ListItem>}
            {error && <ListItem><ListItemText primary="error!" /></ListItem>}
            {data && data.map(device => <DeviceListItem device={device} />)}
        </List>
    )
}

export default DeviceList