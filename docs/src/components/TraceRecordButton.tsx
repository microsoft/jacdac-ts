import { Tooltip } from "@material-ui/core";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import { FiberManualRecord, FiberManualRecordTwoTone } from '@material-ui/icons';
import { IconButton } from "gatsby-theme-material-ui";
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import { BusState } from "../../../src/dom/bus";

export default function TraceRecordFunction(props: { disabled?: boolean, className?: string }) {
    const { disabled, ...others } = props;
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const { recording, toggleRecording } = useContext(PacketsContext)
    const connected = connectionState == BusState.Connected;
    const disableRecord = disabled || !connected;
    const toggleRecord = () => {
        toggleRecording()
    }

    return <Tooltip title={recording ? "Stop recording" : "Record trace"}>
        <span><IconButton {...others} disabled={disableRecord} size="small" key="record" onClick={toggleRecord}>
            {recording ? <FiberManualRecordTwoTone style={{ color: "#f00" }} /> : <FiberManualRecord />}</IconButton></span>
    </Tooltip>
}