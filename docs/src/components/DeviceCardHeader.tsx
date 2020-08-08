import { SRV_CTRL, CtrlCmd, CtrlReg } from "../../../src/dom/constants";
import { CardHeader, Chip, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import { Link, IconButton } from 'gatsby-theme-material-ui';
import { JDDevice } from "../../../src/dom/device";
import React, { Fragment, useState, useEffect } from "react";
import useChange from "../jacdac/useChange";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import { debouncedPollAsync } from "../../../src/dom/utils";


export function DeviceCardHeader(props: { device: JDDevice, showFirmware?: boolean, showTemperature?: boolean }) {
    const { device, showFirmware, showTemperature } = props;
    const controlService = useChange(device, () => device.service(SRV_CTRL))
    const firmwareRegister = showFirmware && controlService?.register(CtrlReg.FirmwareVersion);
    const tempRegister = showTemperature && controlService?.register(CtrlReg.Temperature)
    const firmware = useChange(firmwareRegister, () => firmwareRegister?.stringValue);
    const temperature = useChange(tempRegister, () => tempRegister?.intValue);
    useEffect(() => debouncedPollAsync(() => firmwareRegister && !firmwareRegister.data && firmwareRegister.sendGetAsync(), 5000), [firmwareRegister])
    useEffect(() => debouncedPollAsync(() => tempRegister?.sendGetAsync(), 5000), [tempRegister])

    const handleIdentify = () => {
        device.service(SRV_CTRL).sendCmdAsync(CtrlCmd.Identify)
    }
    const handleReset = () => {
        device.service(SRV_CTRL).sendCmdAsync(CtrlCmd.Reset)
    }
    return <CardHeader
        action={
            <Fragment>
                <IconButton aria-label="identify" title="identify" onClick={handleIdentify}>
                    <FingerprintIcon />
                </IconButton>
                <IconButton aria-label="reset" title="reset" onClick={handleReset}>
                    <RefreshIcon />
                </IconButton>
            </Fragment>
        }
        title={<Link to="/clients/web/dom/device">
            {device.name}
        </Link>}
        subheader={
            <React.Fragment>
                <Typography variant="caption" gutterBottom>{device.deviceId}</Typography>
                {showFirmware && firmware && <Chip size="small" label={`v${firmware}`} />}
                {showTemperature && temperature !== undefined && <Chip size="small" label={`${temperature}°`} />}
            </React.Fragment>
        }
    />
}