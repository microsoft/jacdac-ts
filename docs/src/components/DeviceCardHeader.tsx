import { SRV_CTRL, CtrlCmd, CtrlReg } from "../../../src/dom/constants";
import { CardHeader, Chip, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import { Link } from 'gatsby-theme-material-ui';
import { JDDevice } from "../../../src/dom/device";
import React from "react";
import useRegisterValue from "../jacdac/useRegisterValue";
import DeviceActions from "./DeviceActions";


export function DeviceCardHeader(props: { device: JDDevice, showFirmware?: boolean, showTemperature?: boolean }) {
    const { device, showFirmware, showTemperature } = props;
    const firmwareRegister = useRegisterValue(device, 0, CtrlReg.FirmwareVersion)
    const tempRegister = useRegisterValue(device, 0, CtrlReg.Temperature)
    const firmware = firmwareRegister?.stringValue;
    const temperature = tempRegister?.intValue;
    return <CardHeader
        action={<DeviceActions device={device} reset={true} />}
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