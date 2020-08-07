import React, { useEffect, useState } from "react";
import { JDEvent } from "../../../src/dom/event";
import { CHANGE } from "../../../src/dom/constants";
import { Typography, Badge } from "@material-ui/core";
import KindIcon from "./KindIcon";

export default function EventInput(props: { event: JDEvent, showDeviceName?: boolean, showName?: boolean }) {
    const { event, showName, showDeviceName } = props;
    const [count, setCount] = useState(event.count)
    const spec = event.specification
    useEffect(() => event.subscribe(CHANGE, () => {
        setCount(event.count)
    }))

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