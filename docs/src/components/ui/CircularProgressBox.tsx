import { Box, CircularProgress, useTheme } from "@material-ui/core";
import React from "react";

export interface CircularProgressBoxProps {
    progress?: number;
    progressSize?: React.ReactText,
    progressColor?: "inherit" | "primary" | "secondary",
    progressStyle?: React.CSSProperties;
}

export default function CircularProgressBox(props: { children: JSX.Element | JSX.Element[] } & CircularProgressBoxProps) {
    const { progress, progressColor, progressStyle, progressSize, children } = props;
    const hasProgress = progress !== undefined;
    const theme = useTheme();

    return <Box position="relative" display="inline-flex">
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
            {children}
        </Box>
    </Box>
}