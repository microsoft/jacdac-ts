
import React from 'react';
import { ListItem, Typography, ListItemIcon } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'
import { decode } from 'punycode';
import KindIcon from './KindIcon';

export default function PacketListItem(props: {
    packet: Packet,
    consoleMode?: boolean,
    skipRepeatedAnnounce?: boolean,
    showTime?: boolean
}) {
    const { packet, consoleMode, skipRepeatedAnnounce, showTime } = props;
    let text: string;
    const decoded = decodePacketData(packet);
    if (consoleMode) {
        text = `${deviceServiceName(packet)}: ${decoded?.description || "???"}`
    } else {
        text = printPacket(packet, { skipRepeatedAnnounce, showTime })
    }
    return <ListItem dense={true}>
        <ListItemIcon>
            <KindIcon kind={decoded?.info.kind} />
        </ListItemIcon>
        <Typography variant="body2">{text}</Typography>
    </ListItem>
}
