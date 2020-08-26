import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isEvent } from "../../../src/dom/spec";
import EventInput from "./EventInput";

export default function ServiceEvents(props: {
    service: JDService,
    eventIdentifier?: number,
    showEventName?: boolean
}) {
    const { service, eventIdentifier, showEventName } = props;
    const spec = service.specification;
    const packets = spec.packets;
    let events = packets.filter(isEvent);
    if (eventIdentifier !== undefined)
        events = events.filter(event => event.identifier === eventIdentifier)

    return <React.Fragment>
        {events.map(event => <EventInput key={`event${event.identifier}`} event={service.event(event.identifier)} showName={showEventName} />)}
    </React.Fragment>
}