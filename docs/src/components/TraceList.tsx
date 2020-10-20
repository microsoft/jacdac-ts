import React, { useContext } from "react"
import { graphql, Link, useStaticQuery } from "gatsby";
import { parseTrace } from "../../../src/dom/logparser"
import Trace from "../../../src/dom/trace";
import { createStyles, List, ListItem, ListItemText, makeStyles, Theme } from "@material-ui/core";
import { prettyDuration } from "../../../src/dom/pretty";
import PacketsContext from "./PacketsContext";
import AppContext, { DrawerType } from "./AppContext";

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    textDecoration: "none"
  },
}))

export default function TraceList() {
  const { setReplayTrace, toggleTracing } = useContext(PacketsContext)
  const { setDrawerType } = useContext(AppContext)
  const classes = useStyles();
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

  const handleClick = (trace: Trace) => () => {
    setDrawerType(DrawerType.Packets)
    setReplayTrace(trace)
    toggleTracing();
  }
  return <List className={classes.root}>
    {traces.map(({ trace, name }) => <ListItem button key={name} onClick={handleClick(trace)}>
      <ListItemText
        primary={name}
        secondary={`${prettyDuration(trace.duration)}, ${trace.length} packets`} />
    </ListItem>)}
  </List >;
}