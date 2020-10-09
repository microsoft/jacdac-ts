// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import StopIcon from '@material-ui/icons/Stop';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import IconButtonWithProgress, { IconButtonWithProgressProps } from "./IconButtonWithProgress";

export default function TracePlayButton(props: {} & IconButtonWithProgressProps) {
    const { disabled, ...others } = props;
    const { toggleTrace, tracing, recording, trace } = useContext(PacketsContext)


    return <IconButtonWithProgress
        {...others}
        disabled={disabled || recording || !trace}
        indeterminate={tracing}
        title={!trace ? "Load or record a trace to replay it" : tracing ? "Stop trace" : "Play trace"}
        onClick={toggleTrace}
    >
        {tracing ? <StopIcon /> : <PlayArrowIcon />}
    </IconButtonWithProgress >
}