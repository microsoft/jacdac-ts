import React, { useContext } from "react";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import PrintIcon from '@material-ui/icons/Print';
import { IconButtonProps, NoSsr } from "@material-ui/core";
import IconButtonWithTooltip from "./IconButtonWithTooltip";
import useCall from "./useCall";
import { inIFrame } from "../../../src/jdom/iframeclient"

export default function PrintButton(props: { component?: string } & IconButtonProps) {
    const { disabled, className, ...others } = props;
    const { call } = useCall();

    const onPrint = () => call(() => {
        if (typeof window !== "undefined")
            window.print();
    })

    // print unlikely to work when hosted
    if (inIFrame())
        return null;

    return <NoSsr>
        <IconButtonWithTooltip title={"Print page"} className={className}
            {...others}
            edge="start"
            disabled={disabled}
            onClick={onPrint}>
            <PrintIcon />
        </IconButtonWithTooltip>
    </NoSsr>
}