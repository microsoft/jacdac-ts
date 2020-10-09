import { Grid } from "@material-ui/core";
import React from "react";
import { serviceSpecifications } from "../../../src/dom/spec";
import ServiceSpecificationCard from "./ServiceSpecificationCard"
import useGridBreakpoints from "./useGridBreakpoints";

export default function ServiceSpecificationList(props: {}) {
    const gridBreakpoints = useGridBreakpoints();
    const specs = serviceSpecifications();
    return <Grid container spacing={2}>
        {specs.map(node => <Grid {...gridBreakpoints} item key={node.classIdentifier}>
            <ServiceSpecificationCard serviceClass={node.classIdentifier} />
        </Grid>)}
    </Grid>
}