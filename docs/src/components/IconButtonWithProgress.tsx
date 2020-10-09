import { Box, CircularProgress, IconButtonProps, Tooltip, useTheme } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export type IconButtonWithProgressProps = {
    indeterminate?: boolean,
    progress?: number;
    progressSize?: React.ReactText,
    progressColor?: "inherit" | "primary" | "secondary",
    progressStyle?: React.CSSProperties
} & IconButtonProps;

export default function IconButtonWithProgress(props: IconButtonWithProgressProps) {
    const { indeterminate, progress, title, children, progressColor, progressStyle, progressSize, ...others } = props;
    const theme = useTheme()
    const hasProgress = progress !== undefined;

    return <Tooltip title={title}>
        <span><IconButton {...others}>
            {!indeterminate && children}
            {indeterminate && <Box position="relative" display="inline-flex">
                <CircularProgress variant={hasProgress ? "static" : "indeterminate"}
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
                    {children}
                </Box>
            </Box>}
        </IconButton></span>
    </Tooltip>
}