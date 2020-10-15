import React from "react"
import { Card, CardActions, CardContent, CardHeader, CardMedia, createStyles, Grid, makeStyles, Theme, Typography } from "@material-ui/core";
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec";
import IDChip from "./IDChip";
import { Button } from "gatsby-theme-material-ui";
import Markdown from "./Markdown";

export default function ServiceSpecificationCard(props: { serviceClass?: number, specification?: jdspec.ServiceSpec }) {
    const { serviceClass, specification } = props;
    let spec = specification;
    if (!spec && serviceClass !== undefined)
        spec = serviceSpecificationFromClassIdentifier(serviceClass)

    return <Card>
        <CardHeader
            title={spec?.name || "???"}
            subheader={spec && <IDChip id={spec?.classIdentifier} />}
        />
        <CardContent>
            {spec?.notes["short"] &&
                <Typography variant="body2" component="div">
                    <Markdown source={spec?.notes["short"]} />
                </Typography>
            }
        </CardContent>
        <CardActions>
            <Button to={`/services/${spec?.shortId}`}>More...</Button>
        </CardActions>
    </Card>
}