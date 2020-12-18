import React, { useContext } from 'react';
import { ListItem, ListItemIcon, makeStyles, Theme, createStyles, ListItemText, useMediaQuery, useTheme, Box } from '@material-ui/core';
import Packet from '../../../src/jdom/packet';
import PacketsContext from './PacketsContext';
import PacketBadge from './PacketBadge';
import AppContext, { DrawerType } from './AppContext'
import { MOBILE_BREAKPOINT } from './layout';
import { SRV_LOGGER } from '../../../src/jdom/constants';
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
    const logMessage = packet.service_class === SRV_LOGGER && packet.is_report;
    const primary = (packet.is_crc_ack && `crc ack ${packet.friendlyCommandName}`)
        || (!decoded && "???")
        || (logMessage && decoded.decoded[0].value)
        || `${packet.friendlyCommandName} ${decoded.decoded.map(f => f.humanValue).join(', ')}`;
    const secondary = `${showTime ? `${prettyDuration(packet.timestamp)}: ` : ""}${packet.is_command ? 'to' : 'from'} ${packet.friendlyDeviceName}/${packet.friendlyServiceName}`

    return <ListItem button className={classes.item} dense={true} onClick={handleClick} selected={selected}>
        <ListItemIcon>
            <PacketBadge packet={packet} count={count} />
        </ListItemIcon>
        <ListItemText
            primary={<Box textOverflow="ellipsis">
                {primary}
            </Box>}
            secondary={secondary}
        />
    </ListItem>
}
