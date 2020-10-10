import React, { useContext } from 'react';
import { makeStyles, Theme, createStyles, withStyles, useMediaQuery, useTheme } from '@material-ui/core';
import PacketListItem from './PacketListItem';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PacketsContext, { PacketProps } from './PacketsContext';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButton from '@material-ui/lab/ToggleButton';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AnnouncementIcon from '@material-ui/icons/Announcement';
import KindIcon, { allKinds, kindName } from "./KindIcon";
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer'
import PacketFilter from './PacketFilter';

const useStyles = makeStyles(() =>
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
    showTime: boolean;
}

const VirtualPacketItem = (props: { data: VirtualListData }
    & ListChildComponentProps) => {
    const { style, index, data } = props;
    const { packets, showTime, skipRepeatedAnnounce } = data
    const packet = packets[index];

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

function VirtualPacketList(props: { showTime?: boolean }) {
    const { showTime } = props;
    const classes = useStyles()
    const { packets } = useContext(PacketsContext)
    const itemData: VirtualListData = {
        showTime,
        packets
    }
    return <AutoSizer className={classes.items}>
        {({ height, width }) => (
            <FixedSizeList
                itemCount={packets.length}
                itemSize={54}
                height={height}
                width={width}
                itemData={itemData}>
                {VirtualPacketItem}
            </FixedSizeList>
        )}
    </AutoSizer>
}

export default function PacketList(props: {
    serviceClass?: number,
    showTime?: boolean
}) {
    const { showTime } = props

    return (<>
        <PacketFilter />
        <VirtualPacketList showTime={showTime} />
    </>)
}
