
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { ListItem, ListItemText, GridList } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import useChange from '../jacdac/useChange';
import { BusState } from '../../../src/dom/bus';
import JacdacContext from '../../../src/react/Context';

const DeviceList = () => {
    const { bus, connectionState } = useContext(JacdacContext)
    const devices = useChange(bus, n => n.devices())

    console.log(devices)
    return (
        <GridList aria-label="devices">
            {connectionState == BusState.Connected && !devices.length && <ListItem><ListItemText primary="No device detected..." /></ListItem>}
            {devices.map(device => <DeviceListItem device={device} />)}
            {connectionState == BusState.Disconnected && <ListItem><ListItemText primary="Connect to see devices" /></ListItem>}
        </GridList>
    )

}

export default DeviceList