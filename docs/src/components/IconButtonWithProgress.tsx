import { Box, CircularProgress, IconButtonProps, Tooltip, useTheme } from "@material-ui/core";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import { FiberManualRecordTwoTone } from '@material-ui/icons';
import { IconButton } from "gatsby-theme-material-ui";
import React from "react";

export default function IconButtonWithProgress(props: {
    indeterminate: boolean,
    progressColor?: "inherit" | "primary" | "secondary",
    progressStyle?: React.CSSProperties
} & IconButtonProps) {
    const { indeterminate, title, children, progressColor, progressStyle, ...others } = props;
    const theme = useTheme()

    return <Tooltip title={title}>
        <span><IconButton {...others} size="small">
            {!indeterminate && children}
            {indeterminate && <Box position="relative" display="inline-flex" style={{ color: "#f00" }}>
                <CircularProgress variant="indeterminate" disableShrink size={theme.spacing(3)} color={progressColor} style={progressStyle} />
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