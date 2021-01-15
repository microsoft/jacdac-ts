import { createStyles, makeStyles, useTheme } from "@material-ui/core";

export default function useWidgetTheme(color?: "primary" | "secondary") {
    const theme = useTheme();
    const { palette } = theme;
    const { background } = palette;
    const pcolor: string = color === "primary" ? palette.primary.main
        : color === "secondary" ? palette.secondary.main
            : palette.info.main;

    return {
        background: background.default,
        controlBackground: palette.background.paper,
        active: pcolor,
        textPrimary: palette.text.primary
    }
}