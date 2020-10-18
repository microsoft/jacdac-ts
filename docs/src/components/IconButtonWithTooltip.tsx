import { IconButtonProps, Tooltip } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export default function IconButtonWithTooltip(props: { to?: string } & IconButtonProps) {
    const { title, children, ...others } = props;

    return <Tooltip title={title}>
        <span>
            <IconButton aria-label={title} {...others}>
                {children}
            </IconButton></span>
    </Tooltip>
}