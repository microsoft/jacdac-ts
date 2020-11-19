import React, { useMemo } from "react";
import { deviceToDTDL } from "../../../src/azure-iot/dtdl";
import Snippet from "./Snippet";

export function DeviceDTDLSnippet(props: { dev: jdspec.DeviceSpec }) {
    const { dev } = props;

    const dtdl = useMemo<string>(
        () => deviceToDTDL(dev),
        [dev]);

    return <Snippet value={dtdl} mode="json" download={`${dev.name}.json`} />
}