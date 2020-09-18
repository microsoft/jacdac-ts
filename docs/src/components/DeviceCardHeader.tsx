import { CtrlReg } from "../../../src/dom/constants";
import { CardHeader, Chip, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import { Link } from 'gatsby-theme-material-ui';
import { JDDevice } from "../../../src/dom/device";
import React from "react";
import useRegisterValue from "../jacdac/useRegisterValue";
import DeviceActions from "./DeviceActions";
import DeviceName from "./DeviceName";

function DeviceFirmwareChip(props: { device: JDDevice }) {
    const { device } = props;
    const firmwareRegister = useRegisterValue(device, 0, CtrlReg.FirmwareVersion)
    const firmware = firmwareRegister?.stringValue;
    return (firmware && <Chip size="small" label={firmware} />) || <></>
}

function DeviceTemperatureChip(props: { device: JDDevice }) {
    const { device } = props;
    const tempRegister = useRegisterValue(device, 0, CtrlReg.Temperature)
    const temperature = tempRegister?.intValue;
    return (temperature !== undefined && <Chip size="small" label={`${temperature}°`} />) || <></>
}

export default function DeviceCardHeader(props: { device: JDDevice, showFirmware?: boolean, showTemperature?: boolean }) {
    const { device, showFirmware, showTemperature } = props;
    return <CardHeader
        action={<DeviceActions device={device} reset={true} />}
        title={<Link color="textPrimary" to="/clients/web/dom/device">
            <DeviceName device={device} />
        </Link>}
        subheader={
            <React.Fragment>
                <Typography variant="caption" gutterBottom>{device.deviceId}</Typography>
                {showFirmware && <DeviceFirmwareChip device={device} />}
                {showTemperature && <DeviceTemperatureChip device={device} />}
            </React.Fragment>
        }
    />
}