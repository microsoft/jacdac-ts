import React from "react";
import { JDDevice } from "../../../src/dom/device";
import useDeviceSpecification from "../jacdac/useDeviceSpecification";
import CardMediaWithSkeleton from "./CardMediaWithSkeleton";

export default function DeviceCardMedia(props: { device: JDDevice }) {
    const { device } = props;
    const { specification, imageUrl } = useDeviceSpecification(device)

    return <CardMediaWithSkeleton
        image={imageUrl}
        title={specification?.name}
    />
}