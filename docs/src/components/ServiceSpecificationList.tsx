import { Grid } from "@material-ui/core";
import React, { useMemo } from "react";
import { isInfrastructure, isSensor, serviceSpecifications } from "../../../src/jdom/spec";
import { arrayShuffle } from "../../../src/jdom/utils";
import ServiceSpecificationCard from "./ServiceSpecificationCard"
import useGridBreakpoints from "./useGridBreakpoints";
import GridHeader from "./ui/GridHeader"

export default function ServiceSpecificationList(props: {
    title?: string,
    count?: number,
    shuffle?: boolean,
    infrastructure?: boolean,
    status?: jdspec.StabilityStatus[]
}) {
    const { title, count, shuffle, status, infrastructure } = props;
    const gridBreakpoints = useGridBreakpoints();
    const specs = useMemo(() => {
        let r = serviceSpecifications();
        if (status !== undefined)
            r = r.filter(spec => status.indexOf(spec.status) > -1);
        if (infrastructure !== undefined)
            r = r.filter(spec => isInfrastructure(spec) == infrastructure)
        if (shuffle)
            arrayShuffle(r)
        else
            r.sort((l,r) => l.name.localeCompare(r.name))
        if (count !== undefined)
            r = r.slice(0, count)
        return r;
    }, [count, shuffle, status, infrastructure])

    if (!specs?.length)
        return null;

    return <Grid container spacing={1}>
        {title && <GridHeader title={title} count={specs.length} />}
        {specs.map(node => <Grid {...gridBreakpoints} item key={node.classIdentifier}>
            <ServiceSpecificationCard serviceClass={node.classIdentifier} />
        </Grid>)}
    </Grid>
}