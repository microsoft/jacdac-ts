import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField, ListItem, ButtonGroup, Typography, FormControlLabel, Switch, FormGroup, Tooltip, Divider, makeStyles, Theme, createStyles } from '@material-ui/core';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority, PACKET_PROCESS, PACKET_SEND, SRV_LOGGER } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'
import { isInstanceOf } from '../../../src/dom/spec';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PacketsContext from './PacketsContext';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButton from '@material-ui/lab/ToggleButton';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AnnouncementIcon from '@material-ui/icons/Announcement';
import KindIcon, { allKinds, kindName } from "./KindIcon";
import { IconButton } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import GradientIcon from '@material-ui/icons/Gradient';
import ConsoleListItem from './ConsoleListItem';
import PacketRecorder from './PacketRecorder';
import PacketTraceImporter from "./PacketTraceImporter"

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        items: {
            flex: 1
        }
    })
);

export default function PacketList(props: {
    maxItems?: number,
    serviceClass?: number,
    showTime?: boolean,
    showRecorder?: boolean,
    showButtonText?: boolean
}) {
    const { showTime, showRecorder, showButtonText } = props
    const { flags, setFlags, serviceClass: globalServiceClass, paused, packets, setPackets } = useContext(PacketsContext)
    const serviceClass = props.serviceClass !== undefined ? props.serviceClass : globalServiceClass;
    const classes = useStyles()
    const maxItems = props.maxItems || 100
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const consoleMode = hasFlag("console")
    const skipRepeatedAnnounce = !hasFlag("announce")

    function hasFlag(k: string) {
        return flags.indexOf(k) > -1
    }

    // enable logging
    useEffect(() => {
        if (consoleMode)
            bus.minConsolePriority = ConsolePriority.Debug;
    })
    // render packets
    useEffect(() => bus.subscribe([consoleMode ? PACKET_RECEIVE : PACKET_PROCESS, PACKET_SEND],
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

            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))
    // clear when consoleMode changes
    useEffect(() => {
        setPackets([])
    }, [consoleMode, JSON.stringify(flags)])

    const handleModes = (event: React.MouseEvent<HTMLElement>, newFlags: string[]) => {
        setFlags(newFlags)
    };
    return (<>
        <List className={classes.items} dense={true}>
            {showRecorder && <ListItem key="recorder">
                <PacketRecorder showText={true} />
                <PacketTraceImporter />
            </ListItem>}
            <ListItem key="filters">
                <ToggleButtonGroup value={flags} onChange={handleModes}>
                    <ToggleButton key="console" title={"console mode"} value={"console"}>
                        <GradientIcon />
                        {showButtonText && "log only"}
                    </ToggleButton>
                    {allKinds().map(kind => <ToggleButton key={kind} title={kindName(kind)} value={kind}>
                        <KindIcon kind={kind} />
                        {showButtonText && kindName(kind)}
                    </ToggleButton>)}
                    <ToggleButton key="announce" title={"all announce"} value={"announce"}>
                        <AnnouncementIcon />
                        {showButtonText && "repeated announce"}
                    </ToggleButton>
                </ToggleButtonGroup>
            </ListItem>
            {packets?.map(packet => consoleMode ? <ConsoleListItem key={'csl' + packet.key} packet={packet} />
                : <PacketListItem
                    key={'pkt' + packet.key}
                    packet={packet}
                    skipRepeatedAnnounce={skipRepeatedAnnounce}
                    showTime={showTime} />)}
        </List>
    </>)

}
