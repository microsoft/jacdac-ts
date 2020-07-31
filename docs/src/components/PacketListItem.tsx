
import React from 'react';
import { ListItem } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'
import { hash } from '../../../src/dom/utils'

export default function PacketListItem(props: {
    packet: Packet,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean
}) {
    const { packet, consoleMode, skipRepeatedAnnounce } = props;
    let text: string;
    if (consoleMode) {
        const decoded = decodePacketData(packet);
        text = `${deviceServiceName(packet)}: ${decoded.description}`
    } else {
        text = printPacket(packet, { skipRepeatedAnnounce })
    }
    return <ListItem key={hash(packet.toBuffer(), 32)}>
        {text}
    </ListItem>
}
