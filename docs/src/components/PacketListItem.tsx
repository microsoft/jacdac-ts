
import React from 'react';
import { ListItem, Typography, ListItemIcon, makeStyles, Theme, createStyles } from '@material-ui/core';
import { Packet } from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'
import KindIcon from './KindIcon';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        item: {
            marginBottom: 0,
            borderTop: "1px solid #ddd",
            borderBottom: "1px solid #ddd",
        }
    })
);

export default function PacketListItem(props: {
    packet: Packet,
    skipRepeatedAnnounce?: boolean,
    showTime?: boolean
}) {
    const { packet, skipRepeatedAnnounce, showTime } = props;
    const decoded = decodePacketData(packet);
    const text = printPacket(packet, { skipRepeatedAnnounce, showTime })
    const classes = useStyles()

    return <ListItem className={classes.item} dense={true}>
        <ListItemIcon>
            <KindIcon kind={decoded?.info.kind} />
        </ListItemIcon>
        <Typography variant="body2">{text}</Typography>
    </ListItem>
}
