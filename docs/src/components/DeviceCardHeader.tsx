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
import useRegisterValue from "../jacdac/useRegisterValue";


export function DeviceCardHeader(props: { device: JDDevice, showFirmware?: boolean, showTemperature?: boolean }) {
    const { device, showFirmware, showTemperature } = props;
    const firmwareRegister = useRegisterValue(device, 0, CtrlReg.FirmwareVersion)
    const tempRegister = useRegisterValue(device, 0, CtrlReg.Temperature)
    const firmware = firmwareRegister?.stringValue;
    const temperature = tempRegister?.intValue;
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