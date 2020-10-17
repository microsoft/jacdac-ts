
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PauseIcon from '@material-ui/icons/Pause';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import IconButtonWithProgress, { IconButtonWithProgressProps } from "./IconButtonWithProgress";

export default function TracePauseButton(props: { component?: string } & IconButtonWithProgressProps) {
    const { disabled, ...others } = props;
    const { paused, recording, tracing, togglePaused } = useContext(PacketsContext)

    return <IconButtonWithProgress
        {...others}
        disabled={disabled || recording || tracing}
        title={paused ? "Unlock packets" : "Lock packets"}
        onClick={togglePaused}>
        {paused ? <RefreshIcon /> : <PauseIcon />}
    </IconButtonWithProgress >
}