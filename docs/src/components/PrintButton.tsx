import React, { useContext } from "react";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import PrintIcon from '@material-ui/icons/Print';
import { IconButton, IconButtonProps, NoSsr, Tooltip } from "@material-ui/core";
import DarkModeContext from "./DarkModeContext";
import { useSnackbar } from "notistack";
import AppContext from "./AppContext";
import { delay } from "../../../src/dom/utils";

export default function PrintButton(props: { component?: string } & IconButtonProps) {
    const { disabled, className, ...others } = props;
    const { setError } = useContext(AppContext);

    const onPrint = () => {
        console.log(`printing...`)
        try {
            if (typeof window !== "undefined")
                window.print();
        } catch (e) {
            console.log('print failed')
            setError(e)
        }
    }
    return <NoSsr>
        <Tooltip title={"Print page"} className={className}>
            <span>
                <IconButton
                    {...others}
                    edge="start"
                    disabled={disabled}
                    onClick={onPrint}>
                    <PrintIcon />
                </IconButton >
            </span>
        </Tooltip>
    </NoSsr>
}