import { ButtonGroup } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ClearIcon from '@material-ui/icons/Clear';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PauseIcon from '@material-ui/icons/Pause';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";

export default function PacketRecorder() {
    const { paused, setPaused, setPackets } = useContext(PacketsContext)

    const togglePaused = () => setPaused(!paused)
    const clearPackets = () => setPackets([])

    return <>
        <IconButton key="start" title="start/stop recording packets" onClick={togglePaused}>{paused ? <PlayArrowIcon /> : <PauseIcon />}</IconButton>
        <IconButton key="clear" title="clear all packets" onClick={clearPackets}><ClearIcon /></IconButton>
    </>
}