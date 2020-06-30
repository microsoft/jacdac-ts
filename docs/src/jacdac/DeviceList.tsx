
import React, { useEffect, useState } from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/dom/device";
import { useQuery } from '../../../src/react/useQuery';

const DeviceList = () => {
    let [, setState] = useState({});
    const { loading, error, data } = useQuery<{ devices: Device[] }>(`{
        devices {
            deviceId
            shortId
        }
    }`)
    // force refresh
    useEffect(() => {
        const id = setInterval(() => setState({}), 1000)
        return () => clearInterval(id)
    })

    return (
        <List component="nav" aria-label="devices">
            {loading && <ListItem><ListItemText primary="loading..." /></ListItem>}
            {error && <ListItem><ListItemText primary="error!" /></ListItem>}
            {data && data.devices.map(device => <DeviceListItem device={device} />)}
        </List>
    )
}

export default DeviceList