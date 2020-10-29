import { useEffect, useState } from "react";
import { NAME_CHANGE } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";

export default function useDeviceName(device: JDDevice, includeShortId?: boolean) {
    const [name, setName] = useState(device.friendlyName)

    useEffect(() => device.subscribe(NAME_CHANGE, () => {
        setName(device.friendlyName);
    }), [device])

    let r = name;
    if (includeShortId && name && name !== device.shortId)
        r += ` (${device.shortId})`
    return r;
}