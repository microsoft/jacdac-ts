import { Grid, List, ListItem, ListItemText } from "@material-ui/core";
import React, { useMemo } from "react";
import { isInfrastructure, serviceSpecifications } from "../../../src/jdom/spec";
import { arrayShuffle } from "../../../src/jdom/utils";
import GridHeader from "./ui/GridHeader"
import { Link } from "gatsby-theme-material-ui";

export default function ServiceSpecificationList(props: {
    title?: string,
    count?: number,
    shuffle?: boolean,
    infrastructure?: boolean,
    status?: jdspec.StabilityStatus[]
}) {
    const { title, count, shuffle, status, infrastructure } = props;
    const specs = useMemo(() => {
        let r = serviceSpecifications();
        if (status !== undefined)
            r = r.filter(spec => status.indexOf(spec.status) > -1);
        if (infrastructure !== undefined)
            r = r.filter(spec => isInfrastructure(spec) == infrastructure)
        if (shuffle)
            arrayShuffle(r)
        else
            r.sort((l, r) => l.name.localeCompare(r.name))
        if (count !== undefined)
            r = r.slice(0, count)
        return r;
    }, [count, shuffle, status, infrastructure])

    if (!specs?.length)
        return null;

    return <Grid container spacing={1}>
        {title && <GridHeader title={title} count={specs.length} />}
        <Grid item>
            <List>
                {specs.map(node =>
                    <ListItem key={node.shortId}>
                        <Link to={`/services/${node.shortId}`} style={({ textDecoration: "none" })}>
                            <ListItemText key={node.classIdentifier}
                                primary={node.name}
                                secondary={node.notes["short"]}
                            />
                        </Link>
                    </ListItem>)}
            </List>
        </Grid>
    </Grid>
}