import React, { useContext } from "react";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import PrintIcon from '@material-ui/icons/Print';
import { IconButtonProps, NoSsr } from "@material-ui/core";
import AppContext from "./AppContext";
import IconButtonWithTooltip from "./IconButtonWithTooltip";

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
        <IconButtonWithTooltip title={"Print page"} className={className}
            {...others}
            edge="start"
            disabled={disabled}
            onClick={onPrint}>
            <PrintIcon />
        </IconButtonWithTooltip>
    </NoSsr>
}