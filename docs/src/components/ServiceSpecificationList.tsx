import { Grid } from "@material-ui/core";
import React, { useMemo } from "react";
import { serviceSpecifications } from "../../../src/jdom/spec";
import { arrayShuffle } from "../../../src/jdom/utils";
import ServiceSpecificationCard from "./ServiceSpecificationCard"
import useGridBreakpoints from "./useGridBreakpoints";
import GridHeader from "./ui/GridHeader"

export default function ServiceSpecificationList(props: {
    title?: string,
    count?: number,
    shuffle?: boolean,
    status?: jdspec.StabilityStatus[],
}) {
    const { title, count, shuffle, status } = props;
    const gridBreakpoints = useGridBreakpoints();
    const statuses = status || ["stable", "experimental"]
    const specs = useMemo(() => {
        let r = serviceSpecifications()
            .filter(spec => statuses.indexOf(spec.status) > -1);
        if (shuffle)
            arrayShuffle(r)
        if (count !== undefined)
            r = r.slice(0, count)
        return r;
    }, [count, shuffle, status])

    if (!specs?.length)
        return null;

    return <Grid container spacing={1}>
        {title && <GridHeader title={title} count={specs.length} />}
        {specs.map(node => <Grid {...gridBreakpoints} item key={node.classIdentifier}>
            <ServiceSpecificationCard serviceClass={node.classIdentifier} />
        </Grid>)}
    </Grid>
}