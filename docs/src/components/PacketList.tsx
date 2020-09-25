import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField, ListItem, ButtonGroup, Typography, FormControlLabel, Switch, FormGroup, Tooltip, Divider, makeStyles, Theme, createStyles, withStyles } from '@material-ui/core';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority, PACKET_PROCESS, PACKET_SEND, SRV_LOGGER } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'
import { isInstanceOf } from '../../../src/dom/spec';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PacketsContext, { PacketProps } from './PacketsContext';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButton from '@material-ui/lab/ToggleButton';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AnnouncementIcon from '@material-ui/icons/Announcement';
import KindIcon, { allKinds, kindName } from "./KindIcon";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import GradientIcon from '@material-ui/icons/Gradient';
import ConsoleListItem from './ConsoleListItem';
import PacketRecorder from './PacketRecorder';
import PacketTraceImporter from "./PacketTraceImporter"
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer'

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        items: {
            flex: 1
        }
    })
);

const StyledToggleButtonGroup = withStyles((theme) => ({
    grouped: {
        margin: theme.spacing(0.5),
        border: 'none',
        '&:not(:first-child)': {
            borderRadius: theme.shape.borderRadius,
        },
        '&:first-child': {
            borderRadius: theme.shape.borderRadius,
        },
    },
}))(ToggleButtonGroup);

interface VirtualListData {
    consoleMode: boolean;
    packets: PacketProps[];
    skipRepeatedAnnounce: boolean;
    showTime: boolean;
}

const VirtualPacketItem = (props: { data: VirtualListData }
    & ListChildComponentProps) => {
    const { style, index, data } = props;
    const { packets, consoleMode, showTime, skipRepeatedAnnounce } = data
    const packet = packets[index];

    console.log(props)

    if (!packet)
        return <div style={style}></div>

    return <div style={style}>
        {consoleMode && <ConsoleListItem packet={packet} />}
        {!consoleMode && <PacketListItem
            key={'pkt' + packet.key}
            packet={packet.packet}
            count={packet.count}
            skipRepeatedAnnounce={skipRepeatedAnnounce}
            showTime={showTime} />}
    </div>
}

export default function PacketList(props: {
    serviceClass?: number,
    showTime?: boolean,
    showRecorder?: boolean,
    showButtonText?: boolean
}) {
    const { showTime, showRecorder, showButtonText } = props
    const { flags, setFlags, serviceClass: globalServiceClass, paused, packets, addPacket, clearPackets } = useContext(PacketsContext)
    const serviceClass = props.serviceClass !== undefined ? props.serviceClass : globalServiceClass;
    const classes = useStyles()
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const consoleMode = hasFlag("console")
    const skipRepeatedAnnounce = !hasFlag("announce")
    const size = "small"
    const itemData: VirtualListData = {
        consoleMode, 
        skipRepeatedAnnounce, 
        showTime, 
        packets
    }

    function hasFlag(k: string) {
        return flags.indexOf(k) > -1
    }

    // enable logging
    useEffect(() => {
        if (consoleMode)
            bus.minConsolePriority = ConsolePriority.Debug;
    }, [consoleMode])

    // render packets
    useEffect(() => bus.subscribe(consoleMode ? [PACKET_RECEIVE, PACKET_SEND] : [PACKET_PROCESS, PACKET_SEND],
        (pkt: Packet) => {
            if (paused)
                return; // ignore
            // don't repeat announce
            if (skipRepeatedAnnounce && pkt.isRepeatedAnnounce)
                return;
            // not matching service class
            if (serviceClass !== undefined && !isInstanceOf(pkt.service_class, serviceClass))
                return;

            if (consoleMode && (pkt.service_class !== SRV_LOGGER || pkt.service_command < 0x80 || pkt.service_command > 0x83))
                return;

            const decoded = decodePacketData(pkt);
            if (consoleMode) {
                if (!decoded) {
                    return; // ignore            
                }
            }
            else if (decoded && !hasFlag(decoded.info.kind)) {
                //console.log(`ignore ${decoded.info.kind}`)
                return; // ignore packet type
            }

            addPacket(pkt, decoded)
        }
    ))
    // clear when consoleMode changes
    useEffect(() => {
        clearPackets()
    }, [consoleMode, JSON.stringify(flags)])

    const handleModes = (event: React.MouseEvent<HTMLElement>, newFlags: string[]) => {
        setFlags(newFlags)
    };

    return (<>
        <List dense={true}>
            {showRecorder && <ListItem key="recorder">
                <PacketRecorder showText={true} />
                <PacketTraceImporter />
            </ListItem>}
            <ListItem key="filters">
                <StyledToggleButtonGroup size={size} value={flags} onChange={handleModes}>
                    <ToggleButton size={size} key="console" aria-label={"log only"} value={"console"}>
                        <GradientIcon />
                        {showButtonText && "log only"}
                    </ToggleButton>
                    {allKinds().map(kind => <ToggleButton key={kind} size={size} aria-label={kindName(kind)} value={kind}>
                        <KindIcon kind={kind} />
                        {showButtonText && kindName(kind)}
                    </ToggleButton>)}
                    <ToggleButton size={size} key="announce" aria-label={"repeated announcements"} value={"announce"}>
                        <AnnouncementIcon />
                        {showButtonText && "repeated announce"}
                    </ToggleButton>
                </StyledToggleButtonGroup>
            </ListItem>
        </List>
        <AutoSizer className={classes.items}>
            {({ height, width }) => (
                <FixedSizeList
                    itemCount={packets.length}
                    itemSize={35}
                    height={height}
                    width={width}
                    itemData={itemData}>
                    {VirtualPacketItem}
                </FixedSizeList>
            )}
        </AutoSizer>
    </>)

}
