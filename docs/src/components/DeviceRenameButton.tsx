import React, { useContext } from 'react';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EditIcon from '@material-ui/icons/Edit';
import { JDDevice } from '../../../src/jdom/device';
import { IconButton } from 'gatsby-theme-material-ui';
import AppContext from './AppContext';

export default function DeviceRenameButton(props: { device: JDDevice }) {
    const { device } = props
    const { showRenameDeviceDialog } = useContext(AppContext)
    const handleClick = () => showRenameDeviceDialog(device)
    return <IconButton size="small" aria-label="rename device" title="rename device"
        onClick={handleClick}>
        <EditIcon />
    </IconButton>
}