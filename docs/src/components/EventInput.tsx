import React, { useEffect, useState } from "react";
import { JDEvent } from "../../../src/dom/event";
import { Typography, Badge } from "@material-ui/core";
import KindIcon from "./KindIcon";
import useEventCount from "../jacdac/useEventCount";

export default function EventInput(props: { event: JDEvent, showDeviceName?: boolean, showName?: boolean }) {
    const { event, showName, showDeviceName } = props;
    const count = useEventCount(event)
    const spec = event.specification

    return <React.Fragment>
        {showDeviceName && <Typography>
            {event.service.device.name}/
        </Typography>}
        {showName && spec && <Typography gutterBottom>
            {spec.name}
        </Typography>}
        <Badge badgeContent={count} color="primary">
            <KindIcon kind={"event"} />
        </Badge>
    </React.Fragment>
}