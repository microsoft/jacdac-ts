import React, { } from "react";
import IDChip from "./IDChip";
import Markdown from "./ui/Markdown";
import { Box, Container } from "@material-ui/core";
import ServiceSpecificationStatusAlert from "./ServiceSpecificationStatusAlert"
import { Button, Link } from "gatsby-theme-material-ui";

export default function ServiceMarkdown(props: {
    service: jdspec.ServiceSpec
}) {
    const { service: node } = props;
    const { shortId, name } = node;

    return <Container>
        <ServiceSpecificationStatusAlert specification={node} />
        <Markdown source={node.source} />

        <div>
            <Button variant="contained" to={`/services/${shortId}/playground/`}>Playground</Button>
        </div>

        <h2> See Also</h2>

        <ul>
            <li><a href={`https://github.com/microsoft/jacdac/tree/main/services/${shortId}.md`}>Edit specification source</a>.</li>
            <li>Read <Link to="/reference/service-specification">Service Specification Language</Link> reference</li>
            <li>Create a new service specification using the <Link to="/tools/service-editor">Service Editor</Link></li>
            <li>Using services in JavaScript with the <Link to={`/clients/web/jdom`}>Jacdac Object Model (JDOM)</Link></li>
        </ul>

    </Container>
}