import { useTheme } from "@material-ui/core";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import { FiberManualRecord } from '@material-ui/icons';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import { BusState } from "../../../src/dom/bus";
import IconButtonWithProgress, { IconButtonWithProgressProps } from "./IconButtonWithProgress";

export default function TraceRecordButton(props: {} & IconButtonWithProgressProps) {
    const { disabled, ...others } = props;
    const { recording, tracing, toggleRecording } = useContext(PacketsContext)
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const connecting = connectionState === BusState.Connecting || connectionState == BusState.Disconnecting;

    return <IconButtonWithProgress
        {...others}
        title={recording ? "Stop recording" : "Record trace"}
        indeterminate={recording}
        disabled={disabled || tracing || connecting}
        onClick={toggleRecording}
        progressStyle={{ color: "#f66" }}>
        {!recording && <FiberManualRecord />}
        {recording && <FiberManualRecord style={{ color: "#f00" }} />}
    </IconButtonWithProgress>

}