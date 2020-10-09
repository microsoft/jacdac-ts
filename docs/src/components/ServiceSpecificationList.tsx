import { Grid } from "@material-ui/core";
import React from "react";
import { serviceSpecifications } from "../../../src/dom/spec";
import ServiceSpecificationCard from "./ServiceSpecificationCard"

export default function ServiceSpecificationList(props: {}) {

    const specs = serviceSpecifications();
    return <Grid container spacing={2}>
        {specs.map(node => <Grid xs={6} sm={4} lg={3} item key={node.id}>
            <ServiceSpecificationCard serviceClass={node.classIdentifier} />
        </Grid>)}
    </Grid>

}