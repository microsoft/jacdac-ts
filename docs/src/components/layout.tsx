/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import clsx from 'clsx';
import { makeStyles, useTheme } from '@material-ui/core';
import CssBaseline from '@material-ui/core/CssBaseline';
// tslint:disable-next-line: no-submodule-imports
import AppBar from '@material-ui/core/AppBar';
// tslint:disable-next-line: no-submodule-imports
import Toolbar from '@material-ui/core/Toolbar';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
// tslint:disable-next-line: no-submodule-imports
import Drawer from '@material-ui/core/Drawer'
import ConnectButton from '../jacdac/ConnectButton';
import { Link } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
// tslint:disable-next-line: no-submodule-imports
import Divider from '@material-ui/core/Divider';
// tslint:disable-next-line: no-submodule-imports
import IconButton from '@material-ui/core/IconButton';
// tslint:disable-next-line: no-submodule-imports
import MenuIcon from '@material-ui/icons/Menu';
// tslint:disable-next-line: no-submodule-imports
import ListItem from '@material-ui/core/ListItem';
// tslint:disable-next-line: no-submodule-imports
import List from '@material-ui/core/List';
// tslint:disable-next-line: no-submodule-imports
import ListItemIcon from '@material-ui/core/ListItemIcon';
// tslint:disable-next-line: no-submodule-imports
import ListItemText from '@material-ui/core/ListItemText';
import { useStaticQuery, graphql } from "gatsby"
import JacdacProvider from "../jacdac/Provider"
import ErrorSnackbar from "./ErrorSnackbar"

// tslint:disable-next-line: no-import-side-effect
import "./layout.css"


const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: drawerWidth,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: -drawerWidth,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
}));

const Layout = ({ children }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };
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
  let toc = data.allMdx.edges
    .filter(node => !!node.node.headings.length && !/404/.test(node.node.headings[0].value))
    .map(node => {
      return {
        name: node.node.headings[0].value,
        path: node.node.fields.slug
      }
    })

  toc = toc.concat(data.allSpecJson.nodes.map(node => {
    return {
      name: node.name,
      path: `/services/${node.shortId}`
    }
  }))

  return (
    <JacdacProvider>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar position="fixed"
          className={clsx(classes.appBar, {
            [classes.appBarShift]: open,
          })}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              className={clsx(classes.menuButton, open && classes.hide)}
            > <MenuIcon />
            </IconButton>
            <Typography variant="h6">
              <Link className={classes.menuButton} href="/jacdac-ts" color="inherit">{data.site.siteMetadata.title}</Link>
            </Typography>
            <ConnectButton />
          </Toolbar>
        </AppBar>
        <Drawer
          className={classes.drawer}
          variant="persistent"
          anchor="left"
          open={open}
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <div className={classes.drawerHeader}>
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <Divider />
          <List>
            {toc.map(entry => (
              <ListItem button key={entry.name}>
                <Link to={entry.path}>
                  <ListItemText primary={entry.name} />
                </Link>
              </ListItem>
            ))}
          </List>
        </Drawer>
        <main
          className={clsx(classes.content, {
            [classes.contentShift]: open,
          })}
        >
          <div className={classes.drawerHeader} />
          <Typography>
            {children}
          </Typography>
        </main>
        <footer>
          © {new Date().getFullYear()} Microsoft Corporation
        </footer>
        <ErrorSnackbar />
      </div>
    </JacdacProvider>
  )
}

export default Layout
