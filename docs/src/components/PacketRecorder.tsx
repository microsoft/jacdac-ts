import { Box, ButtonGroup, CircularProgress, createStyles, Divider, LinearProgress, makeStyles, Theme, Typography, useMediaQuery, useTheme } from "@material-ui/core";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ClearIcon from '@material-ui/icons/Clear';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PauseIcon from '@material-ui/icons/Pause';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ReplayIcon from '@material-ui/icons/Replay';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import StopIcon from '@material-ui/icons/Stop';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext, useEffect, useState } from "react";
import PacketsContext from "./PacketsContext";
import TracePlayer from "../../../src/dom/traceplayer"
import useChange from "../jacdac/useChange";
import TraceImportButton from "./TraceImportButton";
import { PROGRESS } from "../../../src/dom/constants";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import { BusState } from "../../../src/dom/bus";
import SaveTraceButton from "./SaveTraceButton";

export default function PacketRecorder(props: {}) {
    const { bus, connectionState, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const { clearPackets, trace, recording, toggleRecording } = useContext(PacketsContext)
    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [progress, setProgress] = useState(0)
    const connected = connectionState == BusState.Connected;
    const tracing = useChange(player, p => !!p?.running);

    const disableSave = tracing;
    const disableRecord = !connected || tracing;
    const disableTrace = !trace || recording || !player;

    useEffect(() => {
        const p = trace && new TracePlayer(bus, trace?.packets);
        setPlayer(p);
        return () => p?.stop();
    }, [trace]);
    useEffect(() => player?.subscribe(PROGRESS, (p: number) => setProgress(p)), [player]);

    const toggleTrace = async () => {
        if (player?.running) {
            player?.stop();
        } else {
            await disconnectAsync();
            setProgress(undefined);
            clearPackets();
            player?.start();
        }
    }
    const toggleRecord = () => {
        toggleRecording()
    }

    return <>
        {tracing && <CircularProgressWithLabel value={progress * 100} />}
        {trace && !tracing && <Typography variant="caption">{trace.packets.length} packets</Typography>}
        <TraceImportButton icon={true} disabled={tracing || recording} />
        <SaveTraceButton disabled={disableSave} />
        |
        <IconButton disabled={disableTrace} size="small" key="replay" title="restart trace packets" onClick={toggleTrace}>{tracing ? <StopIcon /> : <PlayArrowIcon />}</IconButton>
        |
        <IconButton disabled={disableRecord} size="small" key="record" title="start/stop recording packets" onClick={toggleRecord}>{recording ? <StopIcon /> : <FiberManualRecordIcon />}</IconButton>
        <IconButton size="small" key="clear" title="clear all packets" onClick={clearPackets}><ClearIcon /></IconButton>
    </>
}