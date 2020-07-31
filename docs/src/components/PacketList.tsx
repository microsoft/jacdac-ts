import React, { useContext, useState, useEffect } from 'react';
import { Grid, List } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'

const PacketList = (props: {
    maxItems?: number,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean
}) => {
    const { consoleMode, skipRepeatedAnnounce } = props
    const maxItems = props.maxItems || 100
    const { bus } = useContext(JacdacContext)
    const [packets, setPackets] = useState([])
    // enable logging
    useEffect(() => {
        if (consoleMode)
            bus.minConsolePriority = ConsolePriority.Debug;
    })
    // render packets
    useEffect(() => bus.subscribe(PACKET_RECEIVE,
        (pkt: Packet) => {
            if (consoleMode) {
                const decoded = decodePacketData(pkt);
                if (!decoded) return; // ignore
            }
            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))

    return (
        <Grid container>
            <List dense={true}>
                {packets?.map(packet => <PacketListItem packet={packet} consoleMode={consoleMode} skipRepeatedAnnounce={skipRepeatedAnnounce} />)}
            </List>
        </Grid>
    )

}

export default PacketList