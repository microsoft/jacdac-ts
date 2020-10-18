import { Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ClearIcon from '@material-ui/icons/Clear';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import TraceImportButton from "./TraceImportButton";
import SaveTraceButton from "./SaveTraceButton";
import TraceRecordButton from "./TraceRecordButton";
import TracePlayButton from "./TracePlayButton";
import IconButtonWithTooltip from "./IconButtonWithTooltip";

export default function PacketRecorder() {
    const { clearPackets, replayTrace, recording, tracing,
    } = useContext(PacketsContext)

    return <>
        {!recording && replayTrace && <Typography variant="caption">{replayTrace.packets.length} packets</Typography>}
        <TraceImportButton icon={true} disabled={tracing || recording} />
        <SaveTraceButton disabled={tracing || !replayTrace} />
        |
        <TracePlayButton size="small" />
        <TraceRecordButton size="small" />
        |
        <IconButtonWithTooltip title="Clear" size="small" key="clear" onClick={clearPackets}
            disabled={recording || tracing}><ClearIcon />
        </IconButtonWithTooltip>
    </>
}