import { Badge, Box, CircularProgress, IconButtonProps, Tooltip, useTheme } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export type IconButtonWithProgressProps = {
    indeterminate?: boolean,
    badgeColor?: "default" | "primary" | "secondary",
    badgeCount?: number;
    progress?: number;
    progressSize?: React.ReactText,
    progressColor?: "inherit" | "primary" | "secondary",
    progressStyle?: React.CSSProperties
} & IconButtonProps;

export default function IconButtonWithProgress(props: IconButtonWithProgressProps) {
    const { indeterminate, progress, title, children, progressColor, progressStyle, progressSize, badgeCount, badgeColor, ...others } = props;
    const theme = useTheme()
    const hasProgress = progress !== undefined;

    const badge = <Badge color={badgeColor}
        badgeContent={badgeCount}
        invisible={!badgeCount}>
        {children}
    </Badge>

    return <Tooltip title={title}>
        <span><IconButton {...others}>
            {!indeterminate && badge}
            {indeterminate && <Box position="relative" display="inline-flex">
                <CircularProgress variant={hasProgress ? "determinate" : "indeterminate"}
                    disableShrink={!hasProgress}
                    value={progress}
                    size={progressSize || theme.spacing(3)}
                    color={progressColor}
                    style={progressStyle} />
                <Box
                    top={0}
                    left={0}
                    bottom={0}
                    right={0}
                    position="absolute"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    {badge}
                </Box>
            </Box>}
        </IconButton></span>
    </Tooltip>
}