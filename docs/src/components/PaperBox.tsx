import { Box, BoxProps, Paper, PaperProps, useTheme } from "@material-ui/core";
import React from "react";

export function PaperBox(props: { padding?: number } & BoxProps) {
    const { children, padding, ...others } = props;
    const theme = useTheme();

    return <Box {...others} mb={theme.spacing(0.25)}>
        <Paper square>
            {!!padding && <Box p={theme.spacing(0.25)}>
                {children}
            </Box>}
            {padding && children}
        </Paper>
    </Box>
}