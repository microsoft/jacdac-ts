import React, { } from "react";
import Markdown from "./ui/Markdown";
import ServiceSpecificationStatusAlert from "./ServiceSpecificationStatusAlert"
import { Button, Link } from "gatsby-theme-material-ui";
import DeviceSpecificationList from "./DeviceSpecificationList";
import { serviceSpecificationFromClassIdentifier, serviceTestFromServiceSpec } from "../../../src/jdom/spec";

export default function ServiceMarkdown(props: {
    classIdentifier: number,
    source: string
}) {
    const { classIdentifier, source } = props;
    const service = serviceSpecificationFromClassIdentifier(classIdentifier)
    const test = serviceTestFromServiceSpec(service)
    const { shortId } = service;


    return <>
        <ServiceSpecificationStatusAlert specification={service} />
        <Markdown source={source} />

        <div>
            <Button variant="contained" to={`/services/${shortId}/playground/`}>Playground</Button>
            {test && <Button variant="contained" to={`/services/${shortId}/test/`}>Test</Button>}
        </div>

        <h2>Registered Devices</h2>
        <DeviceSpecificationList requiredServiceClasses={[classIdentifier]} />

        <h2> See Also</h2>
        <ul>
            <li><a href={`https://github.com/microsoft/jacdac/edit/main/services/${shortId}.md`}>Edit specification source</a>.</li>
            <li>Read <Link to="/reference/service-specification">Service Specification Language</Link> reference</li>
            <li>Create a new service specification using the <Link to="/tools/service-editor">Service Editor</Link></li>
            <li>Using services in JavaScript with the <Link to={`/clients/web/jdom`}>Jacdac Object Model (JDOM)</Link></li>
        </ul>
    </>
}