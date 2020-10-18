import { IconButtonProps, Tooltip } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export default function IconButtonWithTooltip(props: { to?: string } & IconButtonProps) {
    const { title, children, ...others } = props;

    return <Tooltip aria-label={title} title={title}>
        <span>
            <IconButton {...others}>
                {children}
            </IconButton></span>
    </Tooltip>
}