import { useMediaQuery, useTheme } from "@material-ui/core";

export default function useWidgetSize(widgetCount?: number) {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));
    let widgetSize: string;
    switch (widgetCount || 1) {
        case 1:
        case 2:
            widgetSize = mobile ? "14vh" : "25vh";
            break;
        case 3:
        case 4:
            widgetSize = mobile ? "10vh" : "16vh";
            break;
        default:
            widgetSize = mobile ? "6vh" : "8vh";
            break;
    }
    return widgetSize;
}