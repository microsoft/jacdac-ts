/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React, { useState } from "react"
import clsx from 'clsx';
import { makeStyles, useTheme, Switch, FormControlLabel, FormGroup } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { Link } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
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
// tslint:disable-next-line: no-submodule-imports, match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
// tslint:disable-next-line: no-submodule-imports
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
// tslint:disable-next-line: no-submodule-imports
import Divider from '@material-ui/core/Divider';
// tslint:disable-next-line: no-submodule-imports
import IconButton from '@material-ui/core/IconButton';
// tslint:disable-next-line: no-submodule-imports
import MenuIcon from '@material-ui/icons/Menu';
import { useStaticQuery, graphql } from "gatsby"
import JacdacProvider from "../jacdac/Provider"
import ErrorSnackbar from "./ErrorSnackbar"
import Toc from "./Toc"
import PacketList from "./PacketList"
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"

// tslint:disable-next-line: no-import-side-effect
import "./layout.css"
// tslint:disable-next-line: no-submodule-imports
import Alert from "@material-ui/lab/Alert";

const drawerWidth = `${30}rem`;

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexGrow: 1
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth})`,
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
    marginLeft: `-${drawerWidth}`,
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
}));

const Layout = ({ pageContext, children }) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [drawerConsole, setDrawerConsole] = useState(false);
  const [consoleMode, setConsoleMode] = useState(true);
  const [skipRepeatedAnnounce, setSkipRepeatedAnnounce] = useState(true);
  const serviceClass = pageContext?.node?.classIdentifier;
  const service = serviceClass !== undefined && serviceSpecificationFromClassIdentifier(serviceClass)

  const handleDrawerToc = () => {
    setDrawerConsole(false)
    setOpen(true);
  }
  const handleDrawerConsole = () => {
    setDrawerConsole(true);
    setOpen(true);
  }
  const handleDrawerClose = () => {
    setOpen(false);
  }

  const handleConsoleModeChange = () => {
    setConsoleMode(!consoleMode)
  }

  const handleSkipRepeatedAnnounceChange = () => {
    setSkipRepeatedAnnounce(!skipRepeatedAnnounce)
  }

  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

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
              aria-label="open table of contents"
              onClick={handleDrawerToc}
              edge="start"
              className={clsx(classes.menuButton, open && classes.hide)}
            > <MenuIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="open console"
              onClick={handleDrawerConsole}
              edge="start"
              className={clsx(classes.menuButton, open && classes.hide)}
            > <HistoryIcon />
            </IconButton>
            <Typography variant="h6">
              <Link className={classes.menuButton} href="/jacdac-ts" color="inherit">{data.site.siteMetadata.title}</Link>
            </Typography>
            <div className={clsx(classes.menuButton)}><ConnectButton /></div>
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
            {serviceClass !== undefined && <Alert severity="info">{`Filtered for ${service?.name || serviceClass.toString(16)}`}</Alert>}
            {drawerConsole && <Typography variant="h6">
              <FormGroup row>
                {!consoleMode && <FormControlLabel
                  control={
                    <Switch checked={skipRepeatedAnnounce} onChange={handleSkipRepeatedAnnounceChange} />
                  }
                  label="skip repeat announce"
                />}
                <FormControlLabel
                  control={
                    <Switch checked={!consoleMode} onChange={handleConsoleModeChange} />
                  }
                  label="packets"
                />
              </FormGroup>
            </Typography>}
            <IconButton onClick={handleDrawerClose}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <Divider />
          {drawerConsole ? <PacketList serviceClass={serviceClass} consoleMode={consoleMode} skipRepeatedAnnounce={skipRepeatedAnnounce} /> : <Toc />}
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
