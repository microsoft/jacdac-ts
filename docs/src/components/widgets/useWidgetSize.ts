import { useMediaQuery, useTheme } from "@material-ui/core";

export default function useWidgetSize() {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));
    const widgetSize = mobile ? "11vh" : "15vh";
    return widgetSize;
}