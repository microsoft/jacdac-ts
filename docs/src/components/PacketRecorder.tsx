import { Tooltip, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ClearIcon from '@material-ui/icons/Clear';
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import TraceImportButton from "./TraceImportButton";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import SaveTraceButton from "./SaveTraceButton";
import TraceRecordButton from "./TraceRecordButton";
import TracePlayButton from "./TracePlayButton";

export default function PacketRecorder() {
    const { clearPackets, replayTrace,
        recording, tracing, paused
    } = useContext(PacketsContext)

    return <>
        {!recording && replayTrace && <Typography variant="caption">{replayTrace.packets.length} packets</Typography>}
        <TraceImportButton icon={true} disabled={tracing || recording} />
        <SaveTraceButton disabled={tracing || !replayTrace} />
        |
        <TracePlayButton size="small" />
        <TraceRecordButton size="small" />
        |
        <Tooltip title="Clear">
            <span><IconButton size="small" key="clear" onClick={clearPackets}
                disabled={paused || recording || tracing}><ClearIcon /></IconButton></span>
        </Tooltip>
    </>
}