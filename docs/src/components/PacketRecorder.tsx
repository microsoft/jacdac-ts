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
    const { clearPackets, trace, recording, tracing } = useContext(PacketsContext)

    const disableSave = tracing;

    return <>
        {trace && !tracing && <Typography variant="caption">{trace.packets.length} packets</Typography>}
        <TraceImportButton icon={true} disabled={tracing || recording} />
        <SaveTraceButton disabled={disableSave} />
        |
        <TracePlayButton size="small" />
        |
        <TraceRecordButton size="small" />
        <Tooltip title="Clear">
            <span><IconButton size="small" key="clear" onClick={clearPackets}><ClearIcon /></IconButton></span>
        </Tooltip>
    </>
}