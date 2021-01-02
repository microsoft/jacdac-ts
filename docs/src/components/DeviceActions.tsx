import React, { useContext } from "react"
import { JDDevice } from "../../../src/jdom/device"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import DeviceRenameButton from "./DeviceRenameDialog";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import CmdButton from "./CmdButton";

export default function DeviceActions(props: { device: JDDevice, reset?: boolean, rename?: boolean }) {
    const { device, reset, rename } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const handleIdentify = async () => {
        await device.identify()
    }
    const handleReset = async () => {
        await device.reset()
    }
    return <>
        <CmdButton trackName="device.identify" size="small" title="identify" onClick={handleIdentify} icon={<FingerprintIcon />} />
        {reset && <CmdButton trackName="device.reset" size="small" title="reset" onClick={handleReset} icon={<RefreshIcon />} />}
        {rename && bus.host.deviceNameSettings && <DeviceRenameButton device={device} />}
    </>;
}