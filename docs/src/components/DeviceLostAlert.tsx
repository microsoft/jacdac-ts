import React from "react";
import { LOST, FOUND } from "../../../src/jdom/constants";
import { CircularProgress } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports
import { JDDevice } from "../../../src/jdom/device";
import useEventRaised from "../jacdac/useEventRaised";
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";

export function DeviceLostAlert(props: { device: JDDevice }) {
    const { device } = props;
    const lost = useEventRaised([LOST, FOUND], device, dev => !!dev?.lost)
    return <>
        {lost && <Alert severity="info">Device lost...</Alert>}
    </>
}