import { Typography } from "@material-ui/core";
import { Link } from "gatsby-theme-material-ui";
import React, { useMemo } from "react";
import { deviceSpecificationToDTDL } from "../../../src/azure-iot/dtdl";
import Snippet from "./Snippet";

export function DeviceDTDLSnippet(props: { dev: jdspec.DeviceSpec, inlineServices?: boolean }) {
    const { dev, inlineServices } = props;

    const dtdl = useMemo<string>(
        () => JSON.stringify(deviceSpecificationToDTDL(dev, { inlineServices }), null, 2),
        [dev]);

    return <Snippet value={dtdl} mode="json" download={`${dev.name}.json`}
        caption={<><Link to="/dtmi">DTDL</Link> is an open source modelling language developed by Microsoft Azure.</>} />
}