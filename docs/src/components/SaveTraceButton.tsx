import { IconButton, Tooltip } from "@material-ui/core";
import React, { useContext } from "react";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import SaveIcon from '@material-ui/icons/Save';
import ServiceManagerContext from "./ServiceManagerContext";
import PacketsContext from "./PacketsContext";

export default function SaveTraceButton(props: { disabled?: boolean }) {
    const { disabled } = props;
    const { trace, recording } = useContext(PacketsContext)
    const { fileStorage } = useContext(ServiceManagerContext);
    const saveTrace = () => {
        fileStorage.saveText("trace.jd.txt", trace.serializeToText());
    }
    return <Tooltip title="save trace">
        <span><IconButton disabled={disabled || recording || !trace?.packets.length}
            size="small" key="save" onClick={saveTrace}>
            <SaveIcon />
        </IconButton></span>
    </Tooltip>;
}