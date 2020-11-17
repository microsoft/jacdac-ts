import React, { useContext } from "react"
import { makeStyles, createStyles, Theme, Collapse, List, ListItem, Typography, useTheme, Box } from '@material-ui/core';
import { Link } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
import ListItemText from '@material-ui/core/ListItemText';
import { useStaticQuery, graphql } from "gatsby"

interface TocNode {
  name: string;
  path: string;
  order: number;
  children?: TocNode[];
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
      backgroundColor: theme.palette.background.paper
    }
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
  const r = {
    tree: tree.filter(node => !!node),
    nodes: tocNodes
  }

  function sortNodes(nodes: TocNode[]) {
    nodes.sort((l, r) => l.order - r.order)
    nodes.forEach(node => node.children && sortNodes(node.children))
  }
  sortNodes(r.tree)

  return r;
}

export default function Toc() {
  const classes = useStyles();
  const theme = useTheme();
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
          frontmatter {
            title
            order
            hideToc
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

    allServicesJson {
      nodes {
        name
        shortId
      }
    }

    allDevicesJson {
      nodes {
        id
        name
      }
    }
  }
`)

  // convert pages into tree
  let toc: TocNode[] = [{
    name: "Home",
    path: "/",
    order: 0
  }, {
    name: "Reference",
    path: "/reference/",
    order: 1
  }, {
    name: "Services",
    path: "/services/",
    order: 2
  }, {
    name: "Devices",
    path: "/devices/",
    order: 3
  }, {
    name: "Clients",
    path: "/clients/",
    order: 4
  }, {
    name: "Tools",
    path: "/tools/",
    order: 5
  }, {
    name: "Traces",
    path: "/traces/",
    order: 6
  }, {
    name: "Decks",
    path: "/decks/",
    order: 7
  }]
  data.allMdx.edges.map(node => node.node)
    .filter(node => !!node.frontmatter?.title || (!!node.headings.length && !/404/.test(node.headings[0].value)))
    .filter(node => !node.frontmatter?.hideToc)
    .map(node => {
      const r = {
        name: node.frontmatter?.title || node.headings[0].value,
        path: node.fields.slug,
        order: node.frontmatter?.order !== undefined ? node.frontmatter?.order : 50
      }
      return r;
    })
    .forEach(node => toc.push(node))

  data.allServicesJson.nodes.map(node => {
    return {
      name: node.name,
      path: `/services/${node.shortId}`
    }
  }).forEach(node => toc.push(node))

  data.allDevicesJson.nodes.map(node => {
    return {
      name: node.name,
      path: `/devices/${node.id}`
    }
  }).forEach(node => toc.push(node))

  const { tree } = treeifyToc(toc)

  return <List dense className={classes.root}>
    {tree.map(entry => <TocListItem key={'toc' + entry.path} entry={entry} level={0} />)}
  </List>

  function TocListItem(props: { entry: TocNode, level: number }) {
    const { entry, level } = props;
    const sub = level === 1 || (!!entry.children && !!entry.children.length);

    return <>
      <ListItem button
        key={'tocitem' + entry.path}>
        <Link style={({ color: theme.palette.text.primary })} to={entry.path}>
          <ListItemText
            primary={<Typography variant={sub ? "button" : "caption"}>{entry.name}</Typography>} />
        </Link>
      </ListItem>
      { sub && !!entry.children?.length && <Box ml={level > 0 ? 1 : 0}>
        {entry.children?.map(child => <TocListItem key={'toc' + child.path} entry={child} level={level + 1} />)}
      </Box>}
    </>
  }
}
