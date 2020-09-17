import React, { useContext, useEffect } from "react"
import { JDService } from "../../../src/dom/service"
import { setStreamingAsync } from "../../../src/dom/sensor"
import { SELF_ANNOUNCE } from "../../../src/dom/constants"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import { BusState } from "../../../src/dom/bus"

export default function useStreaming(service: JDService, enabled: boolean): void {
    const { connectionState } = useContext<JDContextProps>(JACDACContext)

    useEffect(() => {
        // call once
        if (connectionState == BusState.Connected)
            setStreamingAsync(service, enabled)
        // keep calling if enabled
        return enabled && service.subscribe(SELF_ANNOUNCE, () => {
            if (connectionState == BusState.Connected)
                setStreamingAsync(service, enabled)
        })
    }, [service?.id, enabled, connectionState])
}