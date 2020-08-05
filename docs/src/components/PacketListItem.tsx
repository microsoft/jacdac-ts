
import React from 'react';
import { ListItem, Typography } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'

export default function PacketListItem(props: {
    packet: Packet,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean,
    showTime?: boolean
}) {
    const { packet, consoleMode, skipRepeatedAnnounce, showTime } = props;
    let text: string;
    if (consoleMode) {
        const decoded = decodePacketData(packet);
        text = `${deviceServiceName(packet)}: ${decoded?.description || "???"}`
    } else {
        text = printPacket(packet, { skipRepeatedAnnounce, showTime })
    }
    return <ListItem dense={true}>
            <Typography variant="body2">{text}</Typography>
        </ListItem>
}
