import { ControlReg, SRV_CTRL } from "../../../src/jdom/constants";
import { CardHeader, Chip, Typography } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import { Link } from 'gatsby-theme-material-ui';
import { JDDevice } from "../../../src/jdom/device";
import React from "react";
import { useRegisterIntValue, useRegisterStringValue } from "../jacdac/useRegisterValue";
import DeviceActions from "./DeviceActions";
import DeviceName from "./DeviceName";
import DeviceCardMedia from "./DeviceCardMedia"
import useDeviceSpecification from "../jacdac/useDeviceSpecification";
import { identifierToUrlPath } from "../../../src/jdom/spec";

function DeviceFirmwareChip(props: { device: JDDevice }) {
    const { device } = props;
    const firmwareRegister = device?.service(0)?.register(ControlReg.FirmwareVersion)
    const firmware = useRegisterStringValue(firmwareRegister);
    return (firmware && <Chip size="small" label={firmware} />) || <></>
}

function DeviceTemperatureChip(props: { device: JDDevice }) {
    const { device } = props;
    const tempRegister = device?.service(0)?.register(ControlReg.McuTemperature)
    const temperature = useRegisterIntValue(tempRegister);
    return (temperature !== undefined && <Chip size="small" label={`${temperature}°`} />) || <></>
}

export default function DeviceCardHeader(props: { device: JDDevice, hideDeviceId?: boolean, showFirmware?: boolean, showTemperature?: boolean, showMedia?: boolean }) {
    const { device, showFirmware, showTemperature, showMedia, hideDeviceId } = props;
    const { specification } = useDeviceSpecification(device);

    return <>
        {showMedia && <DeviceCardMedia device={device} />}
        <CardHeader
            action={<DeviceActions device={device} reset={true} />}
            title={<Link color="textPrimary" to={`/devices/${identifierToUrlPath(specification?.id) || ""}`}>
                <DeviceName device={device} />
            </Link>}
            subheader={<>
                {!hideDeviceId && <Typography variant="caption" gutterBottom>{device.deviceId}</Typography>}
                {showFirmware && <DeviceFirmwareChip device={device} />}
                {showTemperature && <DeviceTemperatureChip device={device} />}
            </>}
        />
    </>
}