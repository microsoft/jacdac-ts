import { Box, BoxProps, Paper, PaperProps, useTheme } from "@material-ui/core";
import React from "react";

export default function PaperBox(props: { padding?: number } & BoxProps) {
    const { children, padding, ...others } = props;
    const theme = useTheme();

    return <Box {...others} mb={theme.spacing(0.25)}>
        <Paper square>
            {padding !== 0 && <Box p={theme.spacing(padding || 0.25)}>
                {children}
            </Box>}
            {padding === 0 && children}
        </Paper>
    </Box>
}