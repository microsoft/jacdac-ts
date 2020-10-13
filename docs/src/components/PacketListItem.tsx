import React, { useContext } from 'react';
import { ListItem, Typography, ListItemIcon, makeStyles, Theme, createStyles, Badge, ListItemText } from '@material-ui/core';
import Packet from '../../../src/dom/packet';
import { printPacket, decodePacketData, deviceServiceName } from '../../../src/dom/pretty'
import KindIcon from './KindIcon';
import PacketsContext from './PacketsContext';
import PacketBadge from './PacketBadge';
import { navigate } from 'gatsby';
import AppContext, { DrawerType } from './AppContext'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        item: {
            marginBottom: 0,
            borderBottom: "1px solid #ddd",
        }
    })
);

export default function PacketListItem(props: {
    packet: Packet,
    skipRepeatedAnnounce?: boolean,
    showTime?: boolean,
    count?: number
}) {
    const { packet, skipRepeatedAnnounce, showTime, count } = props;
    const { selectedPacket, setSelectedPacket } = useContext(PacketsContext)
    const { setDrawerType } = useContext(AppContext)
    const classes = useStyles()

    const handleClick = () => {
        setDrawerType(DrawerType.None)
        setSelectedPacket(packet)
    }
    const selected = packet === selectedPacket

    const primary = `${packet.friendlyCommandName}`
    const secondary = `${packet.is_command ? 'to' : 'from'} ${packet.friendlyDeviceName}/${packet.friendlyServiceName}`

    return <ListItem button className={classes.item} dense={true} onClick={handleClick} selected={selected}>
        <ListItemIcon>
            <PacketBadge packet={packet} count={count} />
        </ListItemIcon>
        <ListItemText
            primary={primary}
            secondary={secondary}
        />
    </ListItem>
}
