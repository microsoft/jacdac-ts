import { Grid, GridSpacing } from "@material-ui/core";
import React from "react";

export default function AutoList(props: { children: JSX.Element | JSX.Element[], spacing?: GridSpacing }) {
    const { children, spacing } = props;
    if (children && Array.isArray(children))
        return <Grid container spacing={spacing}>
            {(children as JSX.Element[]).map((child, i) => <Grid item key={child.key || i}
                xs={12}>
                {child}
            </Grid>)}
        </Grid>
    else
        return children as JSX.Element;
}