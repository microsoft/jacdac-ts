import { useContext, useEffect, useState } from "react";
import { DEVICE_CHANGE } from "../../../../src/jdom/constants";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";

export default function useDeviceCount() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [count, setCount] = useState(bus.devices().length)
    useEffect(() => bus.subscribe(DEVICE_CHANGE,
        () => setCount(bus.devices().length))
        , [])
    return count;
}