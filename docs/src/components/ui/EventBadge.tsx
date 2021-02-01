import { Badge, Chip } from "@material-ui/core";
import React from "react";
import { JDEvent } from "../../../../src/jacdac";
import useEventCount from "../../jacdac/useEventCount";
import KindIcon from "../KindIcon";

export default function EventBadge(props: { event: JDEvent }) {
    const { event } = props;
    const { name } = event;
    const count = useEventCount(event)

    return <Badge badgeContent={count} color="primary">
        {name}
    </Badge>
}
