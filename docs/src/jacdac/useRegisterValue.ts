import React, { useEffect } from "react";
import { JDDevice } from "../../../src/dom/device";
import { setStreamingAsync } from "../../../src/dom/sensor";
import useEventRaised from "./useEventRaised";
import useChange from "./useChange";
import { debouncedPollAsync } from "../../../src/dom/utils";
import { ANNOUNCE } from "../../../src/dom/constants";

export default function useRegisterValue(device: JDDevice, serviceNumber: number, registerIdentifier: number, pollDelay?: number) {
    const service = useChange(device, () => device?.service(serviceNumber))
    const register = service?.register(registerIdentifier)
    const spec = register?.specification
    const isConst = spec?.kind == "const"

    useChange(register);
    useEffect(() => {
        if (!register) return () => {}
        if (register.isReading) {
            setStreamingAsync(register.service, true)
            return () => {}
        }
        else if (isConst) { // ensure data has been collected
            register.sendGetAsync()
            return () => {}
        }
        else // poll data
            return debouncedPollAsync(
                () => register?.sendGetAsync(),
                pollDelay || 5000)
    }, [register])

    return register
}