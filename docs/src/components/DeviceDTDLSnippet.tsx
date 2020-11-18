import React, { useMemo } from "react";
import { deviceToInterface, DTDLtoString } from "../../../src/azure-iot/dtdl";
import Snippet from "./Snippet";

export function DeviceDTDLSnippet(props: { dev: jdspec.DeviceSpec }) {
    const { dev } = props;

    const dtdl = useMemo<string>(
        () => DTDLtoString(deviceToInterface(dev)),
        [dev]);

    return <Snippet value={dtdl} mode="json" />
}