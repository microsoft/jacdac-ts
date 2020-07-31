import React from "react"
import { makeStyles, createStyles, Theme, Collapse } from '@material-ui/core';
import { Link } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
import ListItem from '@material-ui/core/ListItem';
// tslint:disable-next-line: no-submodule-imports
import List from '@material-ui/core/List';
// tslint:disable-next-line: no-submodule-imports
import ListItemIcon from '@material-ui/core/ListItemIcon';
// tslint:disable-next-line: no-submodule-imports
import ListItemText from '@material-ui/core/ListItemText';
import { useStaticQuery, graphql } from "gatsby"


interface TocNode {
    name: string;
    path: string;
    children?: TocNode[];
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: '100%',
            maxWidth: 360,
            backgroundColor: theme.palette.background.paper,
        },
        nested: {
            paddingLeft: theme.spacing(4),
        },
    }),
);

function treeifyToc(toc: TocNode[]) {
    toc = toc.slice(0)
    // reconstruct tree
    const tocNodes: { [index: string]: TocNode } = {};
    toc.forEach(node => tocNodes[node.path.replace(/\/$/, '')] = node);
    toc.forEach((node, index) => {
        const parts = node.path.replace(/\/$/, '').split("/");
        parts.pop();
        while (parts.length) {
            const parentPath = `${parts.join("/")}`;
            const parent = tocNodes[parentPath]
            if (parent) {
                parent.children.push(node)
                toc[index] = undefined;
                break;
            }
            parts.pop();
        }
    })
    toc = toc.filter(node => !!node);
    return toc
}

export default function Toc() {
    const classes = useStyles();
    const data = useStaticQuery(graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }

    allMdx {
      edges {
        node {
          headings {
            value
          }
          excerpt
          fields {
            slug
          }
        }
      }
    }

    allSpecJson {
      nodes {
        name
        shortId
      }
    }

  }
`)

    // convert pages into tree
    let toc: TocNode[] = data.allMdx.edges
        .filter(node => !!node.node.headings.length && !/404/.test(node.node.headings[0].value))
        .map(node => {
            return {
                name: node.node.headings[0].value,
                path: node.node.fields.slug,
                children: []
            }
        })

    toc = toc.concat(data.allSpecJson.nodes.map(node => {
        return {
            name: node.name,
            path: `/services/${node.shortId}`
        }
    }))

    toc = treeifyToc(toc)
    console.log(toc)

    return <List component="nav" className={classes.root}  >
        {toc.map(entry => <TocListItem entry={entry} />)}
    </List>

    function TocListItem(props: { entry: TocNode }) {
        const { entry } = props;
        const sub = !!entry.children && !!entry.children.length;

        return <React.Fragment>
            <ListItem button key={entry.name} className={classes.nested}>
                <Link to={entry.path}>
                    <ListItemText primary={entry.name} />
                </Link>
            </ListItem>
            {sub &&
                <Collapse in={true}>
                    <List component="div">
                        {entry.children.map(child => <TocListItem entry={child} />)}
                    </List>
                </Collapse>}
        </React.Fragment>
    }
}
