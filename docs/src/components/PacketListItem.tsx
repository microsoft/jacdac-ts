
import React from 'react';
import { ListItem } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket } from '../../../src/dom/pretty'
import { hash } from '../../../src/dom/utils'

const PacketListItem = (props: {
    packet: Packet,
    skipRepeatedAnnounce?: boolean
}) => {
    const { packet, skipRepeatedAnnounce } = props;
    const text = printPacket(packet);
    return <ListItem key={hash(packet.toBuffer(), 32)}>
        {printPacket(packet, { skipRepeatedAnnounce })}
    </ListItem>
}

export default PacketListItem;