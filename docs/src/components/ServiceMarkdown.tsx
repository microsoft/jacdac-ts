import React, { } from "react";
import ServiceSpecificationStatusAlert from "./ServiceSpecificationStatusAlert"
import { Button, Link } from "gatsby-theme-material-ui";
import DeviceSpecificationList from "./DeviceSpecificationList";
import ReactMarkdown from "react-markdown"

export default function ServiceMarkdown(props: {
    service: jdspec.ServiceSpec
}) {
    const { service: node } = props;
    const { shortId, classIdentifier } = node;

    /*
    <h2 key="spech2">Exports</h2>
    <ServiceSpecificationSource key="source"
        classIdentifier={classIdentifier}
        showSpecification={false}
    />
    */

    return <>
        <ServiceSpecificationStatusAlert specification={node} />
        <ReactMarkdown source={node.source} />

        <div>
            <Button variant="contained" to={`/services/${shortId}/playground/`}>Playground</Button>
        </div>

        <h2>Registered Devices</h2>
        <DeviceSpecificationList requiredServiceClasses={[classIdentifier]} />

        <h2> See Also</h2>
        <ul>
            <li><a href={`https://github.com/microsoft/jacdac/tree/main/services/${shortId}.md`}>Edit specification source</a>.</li>
            <li>Read <Link to="/reference/service-specification">Service Specification Language</Link> reference</li>
            <li>Create a new service specification using the <Link to="/tools/service-editor">Service Editor</Link></li>
            <li>Using services in JavaScript with the <Link to={`/clients/web/jdom`}>Jacdac Object Model (JDOM)</Link></li>
        </ul>
    </>
}