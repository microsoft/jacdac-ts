import React, { useContext } from 'react';
import { ListItem, ListItemIcon, makeStyles, Theme, createStyles, ListItemText, useMediaQuery, useTheme, Box } from '@material-ui/core';
import Packet from '../../../src/jdom/packet';
import PacketsContext from './PacketsContext';
import PacketBadge from './PacketBadge';
import AppContext, { DrawerType } from './AppContext'
import { MOBILE_BREAKPOINT } from './layout';
import { META_ACK, SRV_LOGGER } from '../../../src/jdom/constants';
import { prettyDuration } from '../../../src/jdom/pretty';

const useStyles = makeStyles(() =>
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
    const { packet, count, showTime } = props;
    const { selectedPacket, setSelectedPacket } = useContext(PacketsContext)
    const { setDrawerType } = useContext(AppContext)
    const classes = useStyles()
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT))
    const { decoded } = packet;

    const handleClick = () => {
        if (mobile)
            setDrawerType(DrawerType.None)
        setSelectedPacket(packet)
    }
    const selected = packet === selectedPacket
    const logMessage = packet.service_class === SRV_LOGGER && packet.isReport && !packet.isRegisterGet;
    const primary = (packet.isCRCAck && `crc ack ${packet.friendlyCommandName}`)
        || (packet.isAnnounce && `announce from ${packet.friendlyDeviceName}`)
        || (!decoded && "???")
        || (logMessage && decoded.decoded[0].value)
        || `${packet.friendlyCommandName} ${decoded.decoded.map(f => f.humanValue).join(', ')}`;
    const secondary = `${showTime ? `${prettyDuration(packet.timestamp)}: ` : ""}${packet.isCommand ? 'to' : 'from'} ${packet.friendlyDeviceName}/${packet.friendlyServiceName}`
    const requiredAck = !!packet.requiresAck;
    const receivedAck = !!packet.meta[META_ACK];
    const direction = packet.isCommand ? "to" : "from";

    return <ListItem button className={classes.item} dense={true} onClick={handleClick} selected={selected}>
        <ListItemIcon>
            <PacketBadge packet={packet} count={count} direction={direction} requiredAck={requiredAck} receivedAck={receivedAck} />
        </ListItemIcon>
        <ListItemText
            primary={<Box textOverflow="ellipsis">
                {primary}
            </Box>}
            secondary={secondary}
        />
    </ListItem>
}
