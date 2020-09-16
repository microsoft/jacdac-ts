import { useEffect, useState } from "react";
import { NAME_CHANGE } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";

export default function useDeviceName(device: JDDevice) {
    const [name, setName] = useState(device.friendlyName)

    useEffect(() => device.subscribe(NAME_CHANGE, () => {
        console.log(`device ${device.deviceId} -> ${device.friendlyName}`)
        setName(device.friendlyName);
    }))

    return name;
}