import { useMediaQuery, useTheme } from "@material-ui/core";

export default function useWidgetSize(variant?: "icon" | "", widgetCount?: number) {
    const icon = variant === "icon"
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("xs"));

    const mini = icon;
    let widgetSize: string;
    switch (widgetCount || 1) {
        case 1:
        case 2:
            widgetSize = mini ? "14vh" : "25vh";
            break;
        case 3:
        case 4:
            widgetSize = mini ? "10vh" : "16vh";
            break;
        default:
            widgetSize = mini ? "6vh" : "8vh";
            break;
    }
    return widgetSize;
}