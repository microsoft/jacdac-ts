import { Grid } from "@material-ui/core";
import React, { useMemo } from "react";
import { JDDevice } from "../../../../src/jdom/device";
import DashboardDevice from "./DashboardDevice";
import { GridBreakpoints } from "../useGridBreakpoints";

export default function DeviceItem(props: {
    device: JDDevice,
    expanded?: boolean,
    toggleExpanded?: () => void,
}) {
    const { device, expanded, toggleExpanded } = props;
    const readingCount = device.services()
        .map(srv => srv.readingRegister ? 1 : 0)
        .reduce((c: number, v) => c + v, 0);
    const breakpoints: GridBreakpoints = useMemo(() => {
        if (readingCount > 3)
            return { xs: 12, sm: 12, md: 12, lg: 8, xl: 6 };
        else if (readingCount == 3)
            return { xs: 12, sm: 6, md: 6, lg: 6, xl: 4 };
        else
            return { xs: expanded ? 12 : 6, sm: 6, md: 6, lg: 4, xl: "auto" };
    }, [expanded, readingCount]);

    // based on size, expanded or reduce widget size
    return <Grid item {...breakpoints}>
        <DashboardDevice
            device={device}
            expanded={expanded}
            toggleExpanded={toggleExpanded} />
    </Grid>
}