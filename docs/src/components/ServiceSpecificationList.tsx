import { Grid } from "@material-ui/core";
import React from "react";
import { serviceSpecifications } from "../../../src/dom/spec";
import { arrayShuffle } from "../../../src/dom/utils";
import ServiceSpecificationCard from "./ServiceSpecificationCard"
import useGridBreakpoints from "./useGridBreakpoints";

export default function ServiceSpecificationList(props: {
    count?: number,
    shuffle?: boolean,
}) {
    const { count, shuffle } = props;
    const gridBreakpoints = useGridBreakpoints();
    let specs = serviceSpecifications();
    if (shuffle)
        arrayShuffle(specs)
    if (count !== undefined)
        specs = specs.slice(0, count)

    return <Grid container spacing={2}>
        {specs.map(node => <Grid {...gridBreakpoints} item key={node.classIdentifier}>
            <ServiceSpecificationCard serviceClass={node.classIdentifier} />
        </Grid>)}
    </Grid>
}