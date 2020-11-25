import React, { useMemo } from "react";
import { deviceSpecificationToDTDL } from "../../../src/azure-iot/dtdl";
import Snippet from "./Snippet";

export function DeviceDTDLSnippet(props: { dev: jdspec.DeviceSpec, inlineServices?: boolean }) {
    const { dev, inlineServices } = props;

    const dtdl = useMemo<string>(
        () => JSON.stringify(deviceSpecificationToDTDL(dev, { inlineServices }), null, 2),
        [dev]);

    return <Snippet value={dtdl} mode="json" download={`${dev.name}.json`} />
}