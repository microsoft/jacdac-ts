import React, { useEffect } from "react";
import { JDDevice } from "../../../src/dom/device";
import useEvent from "./useEvent";
import useChange from "./useChange";
import { debouncedPollAsync } from "../../../src/dom/utils";
import { ANNOUNCE } from "../../../src/dom/constants";

export default function useRegisterValue(device: JDDevice, serviceNumber: number, registerIdentifier: number, pollDelay?: number) {
    const service = useEvent(ANNOUNCE, device, () => device.service(serviceNumber))
    const register = service?.register(registerIdentifier)
    const spec = register?.specification
    const isConst = spec?.kind == "const"

    console.log(`use register ${serviceNumber} ${service} ${registerIdentifier} ${register} ${spec?.name || ""}`)
    useChange(register);
    useEffect(() => debouncedPollAsync(
        () => register && (!isConst || !register.data) && register.sendGetAsync(),
        pollDelay || 5000),
        [register])

    return {
        register: register
    }
}