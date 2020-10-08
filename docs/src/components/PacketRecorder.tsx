import { Box, ButtonGroup, CircularProgress, createStyles, Divider, LinearProgress, makeStyles, Theme, useMediaQuery, useTheme } from "@material-ui/core";
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
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext, useEffect, useState } from "react";
import PacketsContext from "./PacketsContext";
import FramePlayer from "../../../src/dom/frameplayer"
import useChange from "../jacdac/useChange";
import TraceImportButton from "./TraceImportButton";
import { PROGRESS } from "../../../src/dom/constants";
import CircularProgressWithLabel from "./CircularProgressWithLabel";

export default function PacketRecorder(props: {}) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { paused, setPaused, clearPackets, trace } = useContext(PacketsContext)
    const [player, setPlayer] = useState<FramePlayer>(undefined);
    const [progress, setProgress] = useState(0)
    const running = useChange(player, p => !!p?.running);
    const theme = useTheme();

    useEffect(() => {
        const p = trace && new FramePlayer(bus, trace?.frames);
        setPlayer(p);
        return () => p?.stop();
    }, [trace]);
    useEffect(() => player?.subscribe(PROGRESS, (p: number) => {
        console.log(`packet player progress ${p} ${player?.elapsed}`)
        setProgress(p)
    }), [player]);

    const toggleTrace = () => {
        console.log(`toggle trace`, player?.running)
        if (player?.running) {
            player?.stop();
        } else {
            setProgress(undefined);
            clearPackets();
            player?.start();
        }
    }
    const togglePaused = () => setPaused(!paused)

    return <>
        {progress !== undefined && progress > 0 && <CircularProgressWithLabel value={progress * 100} />}
        <TraceImportButton icon={true} />
        <IconButton disabled={!player} size="small" key="replay" title="restart trace packets" onClick={toggleTrace}>{running ? <StopIcon /> : <ReplayIcon />}</IconButton>
        <IconButton size="small" key="start" title="start/stop recording packets" onClick={togglePaused}>{paused ? <PlayArrowIcon /> : <PauseIcon />}</IconButton>
        <IconButton size="small" key="clear" title="clear all packets" onClick={clearPackets}><ClearIcon /></IconButton>
    </>
}