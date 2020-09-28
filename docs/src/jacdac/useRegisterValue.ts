import React, { useEffect } from "react";
import { JDDevice } from "../../../src/dom/device";
import { startStreamingAsync } from "../../../src/dom/sensor";
import useChange from "./useChange";
import { debouncedPollAsync } from "../../../src/dom/utils";

const REGISTER_VALUE_POLL_DELAY = 5000

export default function useRegisterValue(device: JDDevice, serviceNumber: number, registerIdentifier: number, pollDelay?: number) {
    const service = useChange(device, () => device?.service(serviceNumber))
    const register = service?.register(registerIdentifier)
    const spec = register?.specification
    const isConst = spec?.kind == "const"

    useChange(register);
    useEffect(() => {
        if (!register) return () => { }
        if (register.isReading)
            return startStreamingAsync(register.service)
        else if (isConst) { // ensure data has been collected
            register.sendGetAsync()
            return () => { }
        }
        else // poll data
            return debouncedPollAsync(
                () => register?.sendGetAsync(),
                pollDelay || REGISTER_VALUE_POLL_DELAY)
    }, [register])

    return register
}