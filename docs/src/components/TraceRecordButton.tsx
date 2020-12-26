import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import { FiberManualRecord } from '@material-ui/icons';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import { BusState } from "../../../src/jdom/bus";
import IconButtonWithProgress, { IconButtonWithProgressProps } from "./IconButtonWithProgress";

export default function TraceRecordButton(props: { component?: string } & IconButtonWithProgressProps) {
    const { disabled, ...others } = props;
    const { recording, tracing, toggleRecording } = useContext(PacketsContext)
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const connected = connectionState === BusState.Connected;

    return <IconButtonWithProgress
        {...others}
        title={recording ? "Stop recording" : "Record trace"}
        indeterminate={recording}
        disabled={disabled || tracing || !connected}
        onClick={toggleRecording}
        progressStyle={{ color: "#f66" }}>
        {!recording && <FiberManualRecord />}
        {recording && <FiberManualRecord style={{ color: "#f00" }} />}
    </IconButtonWithProgress>

}