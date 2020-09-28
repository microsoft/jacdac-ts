import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField, ListItem, ButtonGroup, Typography, FormControlLabel, Switch, FormGroup, Tooltip, Divider, makeStyles, Theme, createStyles, withStyles, useMediaQuery, useTheme } from '@material-ui/core';
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
    root: {
        display: 'block',
    },
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
    packets: PacketProps[];
    skipRepeatedAnnounce: boolean;
    showTime: boolean;
}

const VirtualPacketItem = (props: { data: VirtualListData }
    & ListChildComponentProps) => {
    const { style, index, data } = props;
    const { packets, showTime, skipRepeatedAnnounce } = data
    const packet = packets[index];

    console.log(props)

    if (!packet)
        return <div style={style}></div>

    return <div style={style}>
        <PacketListItem
            key={'pkt' + packet.key}
            packet={packet.packet}
            count={packet.count}
            skipRepeatedAnnounce={skipRepeatedAnnounce}
            showTime={showTime} />
    </div>
}

export default function PacketList(props: {
    serviceClass?: number,
    showTime?: boolean,
    showRecorder?: boolean
}) {
    const { showTime, showRecorder } = props
    const { flags, setFlags, serviceClass: globalServiceClass, paused, packets, addPacket, clearPackets } = useContext(PacketsContext)
    const serviceClass = props.serviceClass !== undefined ? props.serviceClass : globalServiceClass;
    const classes = useStyles()
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const theme = useTheme();
    const showText = useMediaQuery(theme.breakpoints.up('md'));
    const skipRepeatedAnnounce = !hasFlag("announce")
    const size = "small"
    const itemData: VirtualListData = {
        skipRepeatedAnnounce,
        showTime,
        packets
    }

    function hasFlag(k: string) {
        return flags.indexOf(k) > -1
    }

    // render packets
    useEffect(() => bus.subscribe([PACKET_PROCESS, PACKET_SEND],
        (pkt: Packet) => {
            if (paused)
                return; // ignore
            // don't repeat announce
            if (skipRepeatedAnnounce && pkt.isRepeatedAnnounce)
                return;
            // not matching service class
            if (serviceClass !== undefined && !isInstanceOf(pkt.service_class, serviceClass))
                return;

            const decoded = decodePacketData(pkt);
            if (decoded && !hasFlag(decoded.info.kind)) {
                //console.log(`ignore ${decoded.info.kind}`)
                return; // ignore packet type
            }

            addPacket(pkt, decoded)
        }
    ))

    useEffect(() => {
        clearPackets()
    }, [JSON.stringify(flags)])

    const handleModes = (event: React.MouseEvent<HTMLElement>, newFlags: string[]) => {
        setFlags(newFlags)
    };

    return (<>
        {showRecorder && <div key="recorder">
            <PacketRecorder responsive={true} />
            <PacketTraceImporter />
        </div>}
        <div>
            <StyledToggleButtonGroup size={size} value={flags} onChange={handleModes}>
                {allKinds().map(kind => <ToggleButton key={kind} size={size} aria-label={kindName(kind)} value={kind}>
                    <KindIcon kind={kind} />
                    {showText && kindName(kind)}
                </ToggleButton>)}
                <ToggleButton size={size} key="announce" aria-label={"repeated announcements"} value={"announce"}>
                    <AnnouncementIcon />
                    {showText && "repeated announce"}
                </ToggleButton>
            </StyledToggleButtonGroup>
        </div>
        <AutoSizer className={classes.items}>
            {({ height, width }) => (
                <FixedSizeList
                    itemCount={packets.length}
                    itemSize={49}
                    height={height}
                    width={width}
                    itemData={itemData}>
                    {VirtualPacketItem}
                </FixedSizeList>
            )}
        </AutoSizer>
    </>)

}
