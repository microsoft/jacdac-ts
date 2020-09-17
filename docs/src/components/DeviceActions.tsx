import React, { useContext } from "react"
import { JDDevice } from "../../../src/dom/device"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import { IconButton } from "gatsby-theme-material-ui";
import DeviceRenameButton from "./DeviceRenameDialog";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';

export default function DeviceActions(props: { device: JDDevice, reset?: boolean, rename?: boolean }) {
    const { device, reset, rename } = props
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const handleIdentify = (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.stopPropagation()
        device.identify()
    }
    const handleReset = (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.stopPropagation()
        device.reset()
    }
    return <React.Fragment>
        <IconButton size="small" aria-label="identify" title="identify" onClick={handleIdentify}>
            <FingerprintIcon />
        </IconButton>
        {reset && <IconButton size="small" aria-label="reset" title="reset" onClick={handleReset}>
            <RefreshIcon />
        </IconButton>}
        {rename && bus.host.deviceNameSettings && <DeviceRenameButton device={device} />}
    </React.Fragment>;
}