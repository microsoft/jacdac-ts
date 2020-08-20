import React from "react"
import { JDDevice } from "../../../src/dom/device"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import { IconButton } from "gatsby-theme-material-ui";


export default function DeviceActions(props: { device: JDDevice, reset?: boolean }) {
    const { device, reset } = props
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
</React.Fragment>
}