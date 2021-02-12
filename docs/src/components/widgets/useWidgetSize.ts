import { useMediaQuery, useTheme } from "@material-ui/core";

export default function useWidgetSize(variant?: "icon" | "", widgetCount?: number) {
    const icon = variant === "icon"
    const theme = useTheme();

    const mini = icon;
    let widgetSize: string;
    switch (widgetCount || 1) {
        case 1:
        case 2:
            widgetSize = mini ? "14em" : "25em";
            break;
        case 3:
        case 4:
        case 5:
        case 6:
            widgetSize = mini ? "10em" : "16em";
            break;
        default:
            widgetSize = mini ? "8em" : "14em";
            break;
    }
    return widgetSize;
}