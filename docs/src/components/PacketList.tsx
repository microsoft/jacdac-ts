import React, { useContext, useState, useEffect } from 'react';
import { Grid, List, TextField, ListItem, ButtonGroup, IconButton, Typography, FormControlLabel, Switch, FormGroup } from '@material-ui/core';
import JacdacContext from '../../../src/react/Context';
import PacketListItem from './PacketListItem';
import { PACKET_RECEIVE, ConsolePriority, PACKET_PROCESS, PACKET_SEND } from '../../../src/dom/constants';
import { decodePacketData } from '../../../src/dom/pretty'
import Packet from '../../../src/dom/packet'
import { isInstanceOf } from '../../../src/dom/spec';
import PauseIcon from '@material-ui/icons/Pause';
import ClearIcon from '@material-ui/icons/Clear';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PacketFilterContext from './PacketFilterContext';
import KindIcon from './KindIcon';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

export default function PacketList(props: {
    maxItems?: number,
    serviceClass?: number,
    showTime?: boolean
}) {
    const { serviceClass, showTime } = props
    const { consoleMode, setConsoleMode, skipRepeatedAnnounce, setSkipRepeatedAnnounce, kinds, setKinds } = useContext(PacketFilterContext)
    const maxItems = props.maxItems || 100
    const { bus } = useContext(JacdacContext)
    const [packets, setPackets] = useState<Packet[]>([])
    const [paused, setPaused] = useState(false)


    function showKind(k: string) {
        return kinds.indexOf(k) > -1
    }

    // enable logging
    useEffect(() => {
        if (consoleMode)
            bus.minConsolePriority = ConsolePriority.Debug;
    })
    // render packets
    useEffect(() => bus.subscribe(consoleMode ? [PACKET_RECEIVE] : [PACKET_PROCESS, PACKET_SEND],
        (pkt: Packet) => {
            if (paused)
                return; // ignore

            const decoded = decodePacketData(pkt);
            if (consoleMode) {
                if (!decoded) return; // ignore
            }

            // don't repeat
            if (skipRepeatedAnnounce && pkt.isRepeatedAnnounce)
                return;

            if (serviceClass !== undefined && !isInstanceOf(pkt.service_class, serviceClass))
                return; // not matching service class

            if (decoded && !showKind(decoded.info.kind))
                return; // ignore packet type

            const ps = packets.slice(0, packets.length < maxItems ? packets.length : maxItems)
            ps.unshift(pkt)
            setPackets(ps)
        }
    ))
    // clear when consoleMode changes
    useEffect(() => {
        setPackets([])
    }, [consoleMode, skipRepeatedAnnounce])

    const togglePaused = () => setPaused(!paused)
    const clearPackets = () => setPackets([])
    const handleConsoleModeChange = () => {
        setConsoleMode(!consoleMode)
    }
    const handleSkipRepeatedAnnounceChange = () => {
        setSkipRepeatedAnnounce(!skipRepeatedAnnounce)
    }
    const handleKinds = (event: React.MouseEvent<HTMLElement>, newKinds: string[]) => {
        setKinds(newKinds)
    };
    return (
        <Grid container>
            <List dense={true}>
                <ListItem key="filters">
                    <ButtonGroup>
                        <IconButton title="start/stop recording packets" onClick={togglePaused}>{paused ? <PlayArrowIcon /> : <PauseIcon />}</IconButton>
                        <IconButton title="clear all packets" onClick={clearPackets}><ClearIcon /></IconButton>
                    </ButtonGroup>

                    <ToggleButtonGroup value={kinds} onChange={handleKinds}>
                        {["rw", "ro", "const", "event", "command"].map(kind => <ToggleButton value={kind}><KindIcon kind={kind} /></ToggleButton>)}
                    </ToggleButtonGroup>

                    <Typography variant="h6">
                        <FormGroup row>
                            <FormControlLabel
                                control={
                                    <Switch checked={!consoleMode} onChange={handleConsoleModeChange} />
                                }
                                label="packets"
                            />
                        </FormGroup>
                        {!consoleMode && <FormControlLabel
                            control={
                                <Switch checked={skipRepeatedAnnounce} onChange={handleSkipRepeatedAnnounceChange} />
                            }
                            label={<KindIcon kind="announce" />}
                        />}
                    </Typography>
                </ListItem>
                {packets?.map(packet => <PacketListItem
                    key={packet.key}
                    packet={packet}
                    consoleMode={consoleMode}
                    skipRepeatedAnnounce={skipRepeatedAnnounce}
                    showTime={showTime} />)}
            </List>
        </Grid>
    )

}
