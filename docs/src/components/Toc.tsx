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
// tslint:disable-next-line: no-submodule-imports
import TreeView from '@material-ui/lab/TreeView';
// tslint:disable-next-line: no-submodule-imports
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// tslint:disable-next-line: no-submodule-imports
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
// tslint:disable-next-line: no-submodule-imports
import TreeItem from '@material-ui/lab/TreeItem';

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
  let tree = toc.slice(0)

  // reconstruct tree
  const tocNodes: { [index: string]: TocNode } = {};
  tree.forEach((node, index) => {
    const k = node.path.replace(/\/$/, '')
    if (tocNodes[k]) {
      tree[index] = undefined
    }
    else
      tocNodes[k] = node
  });
  tree = tree.filter(node => !!node)
  tree.forEach((node, index) => {
    const parts = node.path.replace(/\/$/, '').split("/");
    parts.pop();
    while (parts.length) {
      const parentPath = `${parts.join("/")}`;
      const parent = tocNodes[parentPath]
      if (parent) {
        if (!parent.children)
          parent.children = [];
        parent.children.push(node)
        tree[index] = undefined;
        break;
      }
      parts.pop();
    }
  })
  return {
    tree: tree.filter(node => !!node),
    nodes: tocNodes
  }
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
          parent {
            ... on File {
              sourceInstanceName
            }
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
  let toc: TocNode[] = [{
    name: "Home",
    path: "/",
  }, {
    name: "Specification",
    path: "/spec/"
  }, {
    name: "Services",
    path: "/services/"
  }, {
    name: "Clients",
    path: "/clients/"
  }, {
    name: "Tools",
    path: "/tools/"
  }]
  data.allMdx.edges.map(node => node.node)
    .filter(node => !!node.headings.length && !/404/.test(node.headings[0].value))
    .map(node => {
      const r = {
        name: node.headings[0].value,
        path: node.fields.slug
      }
      if (node.parent.sourceInstanceName == "specPages")
        r.path = "/spec" + r.path
      return r;
    })
    .forEach(node => toc.push(node))

  data.allSpecJson.nodes.map(node => {
    return {
      name: node.name,
      path: `/services/${node.shortId}`
    }
  }).forEach(node => toc.push(node))

  const { tree, nodes } = treeifyToc(toc)

  return <TreeView
    className={classes.root}
    defaultCollapseIcon={<ExpandMoreIcon />}
    defaultExpandIcon={<ChevronRightIcon />}
    defaultExpanded={Object.keys(nodes)}
  >
    {tree.map(entry => <TocListItem key={'toc' + entry.path} entry={entry} />)}
  </TreeView>

  function TocListItem(props: { entry: TocNode }) {
    const { entry } = props;
    const sub = !!entry.children && !!entry.children.length;

    return <TreeItem
      key={'tocitem' + entry.path}
      nodeId={entry.path.replace(/\/$/, '')}
      label={<Link to={entry.path}>
        <ListItemText primary={entry.name} />
      </Link>}>
      {sub && entry.children.map(child => <TocListItem key={'toc' + child.path} entry={child} />)}
    </TreeItem>
  }
}
