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
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ReplayIcon from '@material-ui/icons/Replay';

export default function PacketRecorder() {
    const { clearPackets, clearBus,
        replayTrace, recording, tracing, } = useContext(PacketsContext)

    return <>
        {!recording && replayTrace && <Typography variant="caption">{replayTrace.packets.length} packets</Typography>}
        <TraceImportButton icon={true} disabled={tracing || recording} />
        <SaveTraceButton disabled={tracing || !replayTrace} />
        |
        <TracePlayButton size="small" />
        <TraceRecordButton size="small" />
        |
        <IconButtonWithTooltip title="Clear Packets" size="small" key="clearpackets" onClick={clearPackets}
            disabled={recording || tracing}><ClearIcon />
        </IconButtonWithTooltip>
        <IconButtonWithTooltip title="Clear Devices" size="small" key="clearbus" onClick={clearBus}
            disabled={recording || tracing}><ReplayIcon />
        </IconButtonWithTooltip>
    </>
}