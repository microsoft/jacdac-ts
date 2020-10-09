import { Tooltip } from "@material-ui/core";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import StopIcon from '@material-ui/icons/Stop';
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext, useEffect, useState } from "react";
import PacketsContext from "./PacketsContext";
import TracePlayer from "../../../src/dom/traceplayer"
import useChange from "../jacdac/useChange";
import { PROGRESS } from "../../../src/dom/constants";

export default function TracePlayButton() {
    const { bus, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const { clearPackets, trace, recording } = useContext(PacketsContext)
    const [player, setPlayer] = useState<TracePlayer>(undefined);
    const [, setProgress] = useState(0)
    const tracing = useChange(player, p => !!p?.running);

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

    return <Tooltip title={tracing ? "Stop trace" : "Play trace"}>
            <span><IconButton disabled={disableTrace} size="small" key="replay" onClick={toggleTrace}>{tracing ? <StopIcon /> : <PlayArrowIcon />}</IconButton></span>
        </Tooltip>
}