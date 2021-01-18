import { IconButtonProps, Theme, Tooltip, withStyles } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";
import Zoom from '@material-ui/core/Zoom';

// fix for contrast issue
const LightTooltip = withStyles((theme: Theme) => ({
    tooltip: {
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary,
    },
  }))(Tooltip);

export default function IconButtonWithTooltip(props: { to?: string, disabled?: boolean } & IconButtonProps) {
    const { title, children, disabled, ...others } = props;

    return <LightTooltip TransitionComponent={Zoom} title={title}>
        <span>
            <IconButton aria-label={title} disabled={disabled} {...others}>
                {children}
            </IconButton></span>
    </LightTooltip>
}