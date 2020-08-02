import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'

export default function PacketList(props: {
    maxItems?: number,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean,
    filtering?: boolean,
    serviceClass?: number
}) {
    const { consoleMode, skipRepeatedAnnounce, filtering, serviceClass } = props
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
    useEffect(() => bus.subscribe(PACKET_RECEIVE,
        (pkt: Packet) => {
            if (consoleMode) {
                const decoded = decodePacketData(pkt);
                if (!decoded) return; // ignore
            }

            if (filter && pkt.toString().toLowerCase().indexOf(lfilter) < 0)
                return; // no filter mathc

            if (serviceClass !== undefined && pkt.service_class != serviceClass)
                return; // not matching service class

            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))

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
                {packets?.map(packet => <PacketListItem key={packet.key} packet={packet} consoleMode={consoleMode} skipRepeatedAnnounce={skipRepeatedAnnounce} />)}
            </List>
        </Grid>
    )

}
