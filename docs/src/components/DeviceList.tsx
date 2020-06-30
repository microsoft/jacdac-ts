
import React, { useState, useContext, useEffect } from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/dom/device";
import { useQuery } from '../jacdac/useQuery';
import JacdacContext from "../../../src/react/Context";
import { BusState } from '../../../src/dom/bus';
import { DEVICE_CHANGE } from '../../../src/dom/constants';

const DeviceList = () => {
    const { bus, connectionState } = useContext(JacdacContext)
    const { loading, error, data, refresh } = useQuery<{ devices: Device[] }>(`{
        devices {
            id
            deviceId
            shortId
            services {
                name
            }
        }
    }`)
    useEffect(() => {
        bus.on(DEVICE_CHANGE, refresh)
        return () => bus.off(DEVICE_CHANGE, refresh)
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