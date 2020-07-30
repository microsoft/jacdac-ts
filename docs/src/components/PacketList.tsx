import React, { useContext, useState, useEffect } from 'react';
import { Grid } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE } from '../../../src/dom/constants';

const PacketList = (props: {
    maxItems?: number
}) => {
    const maxItems = props.maxItems || 100
    const { bus } = useContext(JacdacContext)
    const [packets, setPackets] = useState([])
    useEffect(() => bus.subscribe(PACKET_RECEIVE,
        pkt => {
            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))

    return (
        <Grid container>
            {packets?.map(packet => <PacketListItem packet={packet} />)}
        </Grid>
    )

}

export default PacketList