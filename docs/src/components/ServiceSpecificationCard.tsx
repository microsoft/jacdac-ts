import React from "react"
import { Card, CardActions, CardContent, CardHeader, CardMedia, createStyles, Grid, makeStyles, Theme, Typography } from "@material-ui/core";
import { serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec";
import IDChip from "./IDChip";
import { Button } from "gatsby-theme-material-ui";
import Markdown from "./ui/Markdown"
import ServiceSpecificationStatusAlert from "./ServiceSpecificationStatusAlert"

export default function ServiceSpecificationCard(props: {
    serviceClass?: number,
    specification?: jdspec.ServiceSpec,
    showReleaseStatus?: boolean,
    showServiceClass?: boolean
}) {
    const { serviceClass, specification, showReleaseStatus, showServiceClass } = props;
    let spec = specification;
    if (!spec && serviceClass !== undefined)
        spec = serviceSpecificationFromClassIdentifier(serviceClass)
    const sc = spec?.classIdentifier || serviceClass;
    const srv = spec?.shortId || sc?.toString(16);

    return <Card>
        <CardHeader
            title={spec?.name || "???"}
            subheader={showServiceClass && srv && <IDChip id={sc} filter={`srv:${srv}`} />}
        />
        <CardContent>
            {spec?.notes["short"] &&
                <Typography variant="body2" component="div">
                    <Markdown source={spec?.notes["short"]} />
                </Typography>
            }
            {showReleaseStatus && <ServiceSpecificationStatusAlert specification={spec} />}
        </CardContent>
        {spec && <CardActions>
            <Button variant="outlined" aria-label={`open service ${spec.shortId} page`} to={`/services/${spec.shortId}/`}>More...</Button>
        </CardActions>}
    </Card>
}