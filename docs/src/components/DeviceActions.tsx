import React, { useContext } from "react"
import { JDDevice } from "../../../src/jdom/device"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import { IconButton } from "gatsby-theme-material-ui";
import DeviceRenameButton from "./DeviceRenameDialog";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import AppContext from "./AppContext";
import CmdButton from "./CmdButton";

export default function DeviceActions(props: { device: JDDevice, reset?: boolean, rename?: boolean }) {
    const { device, reset, rename } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const handleIdentify = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        await device.identify()
    }
    const handleReset = async (ev: React.MouseEvent<HTMLButtonElement>) => {
        await device.reset()
    }
    return <>
        <CmdButton size="small" title="identify" onClick={handleIdentify} icon={<FingerprintIcon />} />
        {reset && <CmdButton size="small" title="reset" onClick={handleReset} icon={<RefreshIcon />} />}
        {rename && bus.host.deviceNameSettings && <DeviceRenameButton device={device} />}
    </>;
}