import { IconButtonProps, Tooltip } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export default function IconButtonWithTooltip(props: { to?: string, disabled?: boolean } & IconButtonProps) {
    const { title, children, disabled, ...others } = props;

    return <Tooltip title={title}>
        <span>
            <IconButton aria-label={title} disabled={disabled} {...others}>
                {children}
            </IconButton></span>
    </Tooltip>
}