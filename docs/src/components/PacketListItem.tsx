
import React from 'react';
import { ListItem } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket } from '../../../src/dom/pretty'


const PacketListItem = (props: { packet: Packet }) => {
    return <ListItem>
        {printPacket(props.packet)}
    </ListItem>
}

export default PacketListItem;