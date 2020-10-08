import { createStyles, makeStyles, Typography } from "@material-ui/core";
import { graphql, Link, useStaticQuery } from "gatsby";
import React from "react";

const useStyles = makeStyles((theme) => createStyles({
    footer: {
        marginTop: theme.spacing(3),
        "& a": {
            marginRight: theme.spacing(0.5)
        }
    }
}));

export default function Footer() {
    const classes = useStyles();
    const data = useStaticQuery(graphql`
      query {
        allJacdacTsJson {
          nodes {
            version
          }
        }
      }
    `)

    return <footer className={classes.footer}>
        <a color="textSecondary" target="_blank" rel="noopener noreferrer" href={`https://github.com/microsoft/jacdac-ts/tree/v${data.allJacdacTsJson.nodes[0].version}`}>JACDAC-TS v{data.allJacdacTsJson.nodes[0].version}</a>
        <a color="textSecondary" href="https://makecode.com/privacy" target="_blank" rel="noopener noreferrer">Privacy &amp; Cookies</a>
        <a color="textSecondary" href="https://makecode.com/termsofuse" target="_blank" rel="noopener noreferrer">Terms Of Use</a>
        <a color="textSecondary" href="https://makecode.com/trademarks" target="_blank" rel="noopener noreferrer">Trademarks</a>
        <Typography color="textSecondary" component="span" variant="inherit">
            © {new Date().getFullYear()} Microsoft Corporation
    </Typography>
    </footer>
}