
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PauseIcon from '@material-ui/icons/Pause';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import React, { useContext } from "react";
import PacketsContext from "./PacketsContext";
import IconButtonWithProgress, { IconButtonWithProgressProps } from "./IconButtonWithProgress";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import { BusState } from '../../../src/dom/bus';

export default function TracePauseButton(props: { component?: string } & IconButtonWithProgressProps) {
    const { disabled, ...others } = props;
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const { paused, togglePaused } = useContext(PacketsContext)
    const connecting = connectionState === BusState.Connecting || connectionState == BusState.Disconnecting;

    return <IconButtonWithProgress
        {...others}
        disabled={disabled || connecting}
        title={paused ? "Resume updates" : "Pause updates"}
        onClick={togglePaused}>
        {paused ? <RefreshIcon /> : <PauseIcon />}
    </IconButtonWithProgress >
}