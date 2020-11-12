import React, { useContext } from "react"
import { graphql, Link, useStaticQuery } from "gatsby";
import { parseTrace } from "../../../src/jdom/logparser"
import Trace from "../../../src/jdom/trace";
import { createStyles, Grid, List, ListItem, ListItemText, makeStyles, Theme } from "@material-ui/core";
import TraceCard from "./TraceCard";
import useGridBreakpoints from "./useGridBreakpoints"
export default function TraceList() {

  const gridBreakpoints = useGridBreakpoints();
  const data = useStaticQuery(graphql`
    query {
        allPlainText {
          nodes {
            content
            parent {
              ... on File {
                name
                ext
              }
            }
          }
        }
      }`)
  const traces: { trace: Trace; name: string }[] = data.allPlainText.nodes
    .filter(node => node.parent?.ext === ".txt")
    .map(node => {
      return {
        trace: parseTrace(node.content as string),
        name: node.parent.name as string
      }
    })
    .filter(trace => !!trace.trace);

  return <Grid container spacing={2}>
    {traces.map(({ trace, name }) => <Grid item key={name}>
      <TraceCard name={name} trace={trace} {...gridBreakpoints} />
    </Grid>)}
  </Grid >;
}