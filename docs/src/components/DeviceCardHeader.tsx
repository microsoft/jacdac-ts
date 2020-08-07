import { SRV_CTRL, CtrlCmd, CtrlReg } from "../../../src/dom/constants";
import { CardHeader } from "@material-ui/core";
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


export function DeviceCardHeader(props: { device: JDDevice }) {
    const { device } = props;
    const controlService = useChange(device, () => device.service(SRV_CTRL))
    const firmwareRegister = controlService?.register(CtrlReg.FirmwareVersion);
    const tempRegister = controlService?.register(CtrlReg.Temperature)
    const firmware = firmwareRegister?.stringValue;
    const temperature = useChange(tempRegister, () => tempRegister?.intValue);
    /*    useEffect(() => debouncedPollAsync(async () => {
            console.log(`poll temperature ${temperature}`)
            if (!firmwareRegister?.data)
                await firmwareRegister?.sendGetAsync()
            await tempRegister?.sendGetAsync()
            setTemperature(tempRegister?.intValue || undefined)
        }), [controlService])
    */
    // keep reading temperature
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
                {device.deviceId}
                {firmware && `, v${firmware}`}
                {temperature !== undefined && `, ${temperature}°`}
            </React.Fragment>
        }
    />
}