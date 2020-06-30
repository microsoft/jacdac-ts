
import React, { useState, useContext, useEffect } from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/dom/device";
import { useQuery } from '../jacdac/useQuery';
import JacdacContext from "../../../src/react/Context";
import { BusState } from '../../../src/dom/bus';
import { DEVICE_ANNOUNCE } from '../../../src/dom/constants';

const DeviceList = () => {
    let [state, setState] = useState(0);
    const { bus, connectionState } = useContext(JacdacContext)
    const { loading, error, data } = useQuery<{ devices: Device[] }>(`{
        devices {
            id
            deviceId
            shortId
            services {
                name
            }
        }
    }`, state.toString())
    useEffect(() => {
        const update = () => setState(state + 1)
        bus.on(DEVICE_ANNOUNCE, update)
        return () => bus.off(DEVICE_ANNOUNCE, update)
    }, [loading, error])

    return (
        <List component="nav" aria-label="devices">
            {loading && <ListItem><ListItemText primary="loading..." /></ListItem>}
            {error && <ListItem><ListItemText primary="error!" /></ListItem>}
            {data && !data.devices.length && <ListItem><ListItemText primary="No device detected..." /></ListItem>}
            {data && data.devices.map(device => <DeviceListItem device={device} />)}
            {connectionState == BusState.Disconnected && <ListItem><ListItemText primary="Connect to see devices" /></ListItem>}
        </List>
    )
}

export default DeviceList