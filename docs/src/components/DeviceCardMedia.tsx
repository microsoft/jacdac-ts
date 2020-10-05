import React from "react";
import { CtrlReg, SRV_CTRL } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";
import { deviceSpecificationFromClassIdenfitier, imageDeviceOf } from "../../../src/dom/spec";
import useRegisterValue from "../jacdac/useRegisterValue";
import CardMediaWithSkeleton from "./CardMediaWithSkeleton";

export default function DeviceCardMedia(props: { device: JDDevice }) {
    const { device } = props;
    const deviceClass = device && useRegisterValue(device, SRV_CTRL, CtrlReg.DeviceClass);
    const deviceSpecification = deviceSpecificationFromClassIdenfitier(deviceClass?.intValue);
    const imageUrl = imageDeviceOf(deviceSpecification);

    return <CardMediaWithSkeleton
        image={imageUrl}
        title={deviceSpecification?.name}
    />
}