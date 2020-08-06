import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isEvent } from "../../../src/dom/spec";
import { setStreamingAsync } from "../../../src/dom/sensor"
import RegisterInput from "./RegisterInput";
import { CHANGE } from "../../../src/dom/constants";
import JacdacContext from '../../../src/react/Context';
import { BusState } from "../../../src/dom/bus";
import EventInput from "./EventInput";

export default function ServiceEvents(props: {
    service: JDService,
    eventIdentifier?: number,
    showEventName?: boolean
}) {
    const { connectionState } = useContext(JacdacContext)
    const { service, eventIdentifier, showEventName } = props;
    const spec = service.specification;
    const packets = spec.packets;
    let events = packets.filter(isEvent);
    if (eventIdentifier !== undefined)
        events = events.filter(event => event.identifier === eventIdentifier)

    return <React.Fragment>
        {events.map(event => <EventInput event={service.event(event.identifier)} showName={showEventName} />)}
    </React.Fragment>
}