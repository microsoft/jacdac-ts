import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority, PACKET_PROCESS } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'
import { isInstanceOf } from '../../../src/dom/spec';

export default function PacketList(props: {
    maxItems?: number,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean,
    filtering?: boolean,
    serviceClass?: number,
    showTime?: boolean
}) {
    const { consoleMode, skipRepeatedAnnounce, filtering, serviceClass, showTime } = props
    const maxItems = props.maxItems || 100
    const { bus } = useContext(JacdacContext)
    const [packets, setPackets] = useState<Packet[]>([])
    const [filter, setFilter] = useState("")
    // enable logging
    useEffect(() => {
        if (consoleMode)
            bus.minConsolePriority = ConsolePriority.Debug;
    })
    // render packets
    useEffect(() => bus.subscribe(consoleMode ? PACKET_RECEIVE : PACKET_PROCESS,
        (pkt: Packet) => {
            if (consoleMode) {
                const decoded = decodePacketData(pkt);
                if (!decoded) return; // ignore
            }

            if (filter && pkt.toString().toLowerCase().indexOf(lfilter) < 0)
                return; // no filter mathc

            // don't repeat
            if (skipRepeatedAnnounce && pkt.isRepeatedAnnounce)
                return;

            if (serviceClass !== undefined && !isInstanceOf(pkt.service_class, serviceClass))
                return; // not matching service class

            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))
    // clear when consoleMode changes
    useEffect(() => {
        setPackets([])
    }, [consoleMode, skipRepeatedAnnounce])

    const lfilter = filter.toLowerCase();
    return (
        <Grid container>
            {filtering && <TextField
                label="Filter"
                variant="outlined"
                fullWidth
                margin="normal"
                value={filter}
                size="small"
                onChange={event => setFilter(event.target.value)}
            />}
            <List dense={true}>
                {packets?.map(packet => <PacketListItem
                    key={packet.key}
                    packet={packet}
                    consoleMode={consoleMode}
                    skipRepeatedAnnounce={skipRepeatedAnnounce}
                    showTime={showTime} />)}
            </List>
        </Grid>
    )

}
