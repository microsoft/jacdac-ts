import React, { useContext } from "react"
import { JDDevice } from "../../../src/jdom/device"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import DeviceRenameButton from "./DeviceRenameButton";
import JacdacContext, { JDContextProps } from '../../../src/react/Context';
import CmdButton from "./CmdButton";
import useDeviceHost from "./hooks/useDeviceHost"
import CloseIcon from '@material-ui/icons/Close';

export default function DeviceActions(props: {
    device: JDDevice,
    showReset?: boolean,
    showRename?: boolean,
    showStopHost?: boolean,
    hideIdentity?: boolean,
    children?: JSX.Element | JSX.Element[]
}) {
    const { device, showReset, showRename, children, hideIdentity, showStopHost } = props
    const { bus } = useContext<JDContextProps>(JacdacContext)
    const host = useDeviceHost(device);

    const handleIdentify = async () => {
        await device.identify()
    }
    const handleReset = async () => {
        await device.reset()
    }
    const handleStop = () => {
        bus.removeDeviceHost(host);
    }    
    return <>
        {showStopHost && host && <CmdButton trackName="device.stop" size="small" title="stop simulator" onClick={handleStop} icon={<CloseIcon />} />}
        {!hideIdentity && <CmdButton trackName="device.identify" size="small" title="identify" onClick={handleIdentify} icon={<FingerprintIcon />} />}
        {showReset && <CmdButton trackName="device.reset" size="small" title="reset" onClick={handleReset} icon={<RefreshIcon />} />}
        {showRename && bus.host.deviceNameSettings && <DeviceRenameButton device={device} />}
        {children}
    </>;
}