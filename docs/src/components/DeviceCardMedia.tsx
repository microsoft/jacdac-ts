import React from "react";
import { CtrlReg, SRV_CTRL } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";
import { deviceSpecificationFromClassIdenfitier, imageDeviceOf } from "../../../src/dom/spec";
import useDeviceSpecification from "../jacdac/useDeviceSpecification";
import useRegisterValue from "../jacdac/useRegisterValue";
import CardMediaWithSkeleton from "./CardMediaWithSkeleton";

export default function DeviceCardMedia(props: { device: JDDevice }) {
    const { device } = props;
    const { specification, imageUrl } = useDeviceSpecification(device)

    return <CardMediaWithSkeleton
        image={imageUrl}
        title={specification?.name}
    />
}