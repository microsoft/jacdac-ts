
import React from 'react';
import { ListItem, Typography, ListItemIcon } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'
import KindIcon from './KindIcon';

export default function PacketListItem(props: {
    packet: Packet,
    skipRepeatedAnnounce?: boolean,
    showTime?: boolean
}) {
    const { packet, skipRepeatedAnnounce, showTime } = props;
    const decoded = decodePacketData(packet);
    const text = printPacket(packet, { skipRepeatedAnnounce, showTime })
    return <ListItem dense={true}>
        <ListItemIcon>
            <KindIcon kind={decoded?.info.kind} />
        </ListItemIcon>
        <Typography variant="body2">{text}</Typography>
    </ListItem>
}
