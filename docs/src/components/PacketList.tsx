import React, { useContext, useState, useEffect } from 'react';
import { Grid } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE } from '../../../src/dom/constants';

const PacketList = (props: {}) => {
    const { bus } = useContext(JacdacContext)
    const [packets, setPackets] = useState([])
    useEffect(() => bus.subscribe(PACKET_RECEIVE,
        pkt => setPackets([pkt].concat(packets))
    ))

    return (
        <Grid
            container
            spacing={2}
        >
            {packets?.map(packet => <PacketListItem packet={packet} />)}
        </Grid>
    )

}

export default PacketList