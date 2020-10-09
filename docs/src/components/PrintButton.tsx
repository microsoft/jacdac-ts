import React from "react";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import PrintIcon from '@material-ui/icons/Print';
import { IconButton, IconButtonProps, NoSsr, Tooltip } from "@material-ui/core";

export default function PrintButton(props: { component?: string } & IconButtonProps) {
    const { disabled, ...others } = props;
    const onPrint = () => {
        try {
            window.print();
        } catch (e) {

        }
    }
    return <NoSsr>
        <Tooltip title={"Print page"}>
            <IconButton
                {...others}
                disabled={disabled}
                onClick={onPrint}>
                <PrintIcon />
            </IconButton >
        </Tooltip>
    </NoSsr>
}