/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React, { useContext } from "react"
import clsx from 'clsx';
import { makeStyles, Container, Hidden, Box, Tooltip, Zoom } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { Link, IconButton, Fab } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
import CssBaseline from '@material-ui/core/CssBaseline';
// tslint:disable-next-line: no-submodule-imports
import AppBar from '@material-ui/core/AppBar';
// tslint:disable-next-line: no-submodule-imports
import Toolbar from '@material-ui/core/Toolbar';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import ConnectButton from '../jacdac/ConnectButton';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import MenuIcon from '@material-ui/icons/Menu';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AccountTreeIcon from '@material-ui/icons/AccountTree';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import MoreIcon from '@material-ui/icons/MoreVert';
import { useStaticQuery, graphql } from "gatsby"
import JACDACProvider from "../jacdac/Provider"
// tslint:disable-next-line: no-import-side-effect
import "./layout.css"
import PacketsContext, { PacketsProvider } from "./PacketsContext";
import SEO from "./seo";
import { DbProvider } from "./DbContext";
import FlashButton from "./FlashButton";
// tslint:disable-next-line: no-submodule-imports
import { createMuiTheme, responsiveFontSizes, ThemeProvider, createStyles, useTheme } from '@material-ui/core/styles';
import AppContext, { AppProvider, DrawerType } from "./AppContext";
import AppDrawer from "./AppDrawer";
import WebUSBAlert from "./WebUSBAlert";
import useFirmwareBlobs from "./useFirmwareBlobs";
import { MDXProvider } from "@mdx-js/react";
import { ServiceManagerProvider } from "./ServiceManagerContext";
import DarkModeProvider from "./DarkModeProvider";
import DarkModeContext from "./DarkModeContext";
import ToolsDrawer from "./ToolsDrawer";
import Helmet from "react-helmet";
import Alert from "./Alert"
import GitHubButton from "./GitHubButton"
import Presentation from "./Presentation";
import useMdxComponents from "./useMdxComponents";
import Footer from "./Footer";
import HideOnScroll from "./HideOnScroll";
import TraceRecordButton from "./TraceRecordButton"
import TracePlayButton from "./TracePlayButton";
import PrintButton from "./PrintButton";
import WebUSBSupported from "./WebUSBSupported";
import { SnackbarProvider } from 'notistack';

export const TOC_DRAWER_WIDTH = 18;
export const DRAWER_WIDTH = 40;
export const TOOLS_DRAWER_WIDTH = 22;
export const MOBILE_DRAWER_WIDTH = 20;
export const MOBILE_TOOLS_DRAWER_WIDTH = 18;
export const MOBILE_BREAKPOINT = "md"

const useStyles = makeStyles((theme) => createStyles({
  root: {
    display: 'flex',
    flexGrow: 1
  },
  grow: {
    flexGrow: 1,
  },
  appBar: {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${DRAWER_WIDTH}rem)`,
    marginLeft: `${DRAWER_WIDTH}rem`,
    [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
      width: `calc(100% - ${MOBILE_DRAWER_WIDTH}rem)`,
      marginLeft: `${MOBILE_DRAWER_WIDTH}rem`,
    },
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  tocBarShift: {
    width: `calc(100% - ${TOC_DRAWER_WIDTH}rem)`,
    marginLeft: `${TOC_DRAWER_WIDTH}rem`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  toolBarShift: {
    width: `calc(100% - ${TOOLS_DRAWER_WIDTH}rem)`,
    marginRight: `${TOOLS_DRAWER_WIDTH}rem`,
    [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
      width: `calc(100% - ${MOBILE_TOOLS_DRAWER_WIDTH}rem)`,
      marginRight: `${MOBILE_TOOLS_DRAWER_WIDTH}rem`,
    },
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(1),
  },
  hideMobile: {
    [theme.breakpoints.down('md')]: {
      display: 'none',
    }
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
    display: 'flex',
    minHeight: '100vh',
    minWidth: '10rem',
    flexDirection: 'column',
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    flexGrow: 1
  },
  mainContent: {
    flexGrow: 1
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  toolsContentShift: {
    width: `calc(100% - 0.5rem)`,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: `-${TOOLS_DRAWER_WIDTH}rem`,
    [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
      marginLeft: `-${MOBILE_TOOLS_DRAWER_WIDTH}rem`,
    }
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    "& > *": {
      margin: theme.spacing(1)
    }
  },
}));

export default function Layout(props: { pageContext?: any; children: any; }) {
  return <DarkModeProvider>
    <LayoutWithDarkMode {...props} />
  </DarkModeProvider>
}

function LayoutWithDarkMode(props: { pageContext?: any; children: any; }) {
  const { darkMode, darkModeMounted } = useContext(DarkModeContext)
  const rawTheme = createMuiTheme({
    palette: {
      type: darkMode
    }
  })
  const theme = responsiveFontSizes(rawTheme);
  const mdxComponents = useMdxComponents()

  if (!darkModeMounted)
    return <div />

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider maxSnack={3}>
        <DbProvider>
          <JACDACProvider>
            <ServiceManagerProvider>
              <PacketsProvider>
                <MDXProvider components={mdxComponents}>
                  <AppProvider>
                    <LayoutWithContext {...props} />
                  </AppProvider>
                </MDXProvider>
              </PacketsProvider>
            </ServiceManagerProvider>
          </JACDACProvider>
        </DbProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

function MainAppBar(props: { pageContext?: any }) {
  const { pageContext } = props;
  const classes = useStyles();
  const { drawerType, setDrawerType, toolsMenu, setToolsMenu } = useContext(AppContext)
  const { darkMode } = useContext(DarkModeContext)
  const drawerOpen = drawerType !== DrawerType.None
  const pageTitle = pageContext?.frontmatter?.title;
  const pageDeck = !!pageContext?.frontmatter?.deck;
  const appBarColor = pageDeck ? "transparent" : darkMode === "dark" ? "inherit" : undefined;

  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)
  const title = data.site.siteMetadata.title;

  const handleDrawerToc = () => {
    setDrawerType(DrawerType.Toc)
  }
  const handleDrawerConsole = () => {
    setDrawerType(DrawerType.Packets);
  }
  const handleDrawerDom = () => {
    setDrawerType(DrawerType.Dom);
  }
  const toggleToolsMenu = () => setToolsMenu(!toolsMenu)

  return <Box displayPrint="none"><AppBar
    position="fixed"
    elevation={pageDeck ? 0 : 2}
    color={appBarColor}
    className={clsx(classes.appBar, {
      [classes.tocBarShift]: drawerType === DrawerType.Toc,
      [classes.appBarShift]: drawerOpen && drawerType !== DrawerType.Toc,
      [classes.toolBarShift]: toolsMenu,
    })}
  >
    <Toolbar>
      <Tooltip aria-label="open table of contents" title="open table of contents">
        <span className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)}>
          <IconButton
            color="inherit"
            onClick={handleDrawerToc}
            edge="start"
          > <MenuIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip aria-label="open device tree" title="open DOM tree">
        <span className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)}>
          <IconButton
            color="inherit"
            onClick={handleDrawerDom}
            edge="start"
          > <AccountTreeIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip aria-label="open packet console" title="open packet console">
        <span className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)}>
          <IconButton
            color="inherit"
            onClick={handleDrawerConsole}
            edge="start"
          > <HistoryIcon />
          </IconButton>
        </span>
      </Tooltip>
      {!drawerOpen && !toolsMenu && <Hidden mdDown={true}>
        <Typography variant="h6">
          <Link className={classes.menuButton} href="/jacdac-ts" color="inherit">{title}</Link>
        </Typography>
        {pageTitle && pageTitle !== "JACDAC" &&
          <Typography variant="h6">
            {"/"} {pageTitle}
          </Typography>}
      </Hidden>}
      <div className={classes.grow} />
      <WebUSBSupported><div className={clsx(classes.menuButton)}><ConnectButton transparent={true} /></div></WebUSBSupported>
      <GitHubButton className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} repo={"microsoft/jacdac"} />
      <PrintButton className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} color="inherit" />
      <div className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)}><FlashButton /></div>
      <IconButton color="inherit" className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} onClick={toggleToolsMenu} aria-label="More">
        <MoreIcon />
      </IconButton>
    </Toolbar>
  </AppBar></Box>
}

function FabBar() {
  const classes = useStyles();
  const theme = useTheme();
  const { trace } = useContext(PacketsContext)

  return <Box className={classes.fab} displayPrint="none">
    {trace && <Zoom in={true}>
      <Fab color="primary" aria-label="play trace">
        <TracePlayButton component="span" color="inherit" progressColor="inherit" progressSize={theme.spacing(6)} />
      </Fab>
    </Zoom>}
    {trace && <Zoom in={true}>
      <Fab color="secondary" aria-label="record trace">
        <TraceRecordButton component="span" color="inherit" progressColor="inherit" progressSize={theme.spacing(6)} />
      </Fab>
    </Zoom>}
  </Box>
}

function LayoutWithContext(props: {
  pageContext?: any;
  children: any;
}) {
  const { pageContext, children, } = props;
  const classes = useStyles();
  const { drawerType, toolsMenu } = useContext(AppContext)
  useFirmwareBlobs();
  const drawerOpen = drawerType !== DrawerType.None
  const pagePath = pageContext?.frontmatter?.path;
  const pageDeck = !!pageContext?.frontmatter?.deck;

  return (<>
    <div className={classes.root}>
      <SEO />
      <CssBaseline />
      <Helmet>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
      </Helmet>
      <HideOnScroll>
        <div><MainAppBar pageContext={pageContext} /></div>
      </HideOnScroll>
      <AppDrawer pagePath={pagePath} />
      <ToolsDrawer />
      {pageDeck && <Presentation>
        {children}
      </Presentation>}
      {!pageDeck && <Container disableGutters={true}>
        <main
          className={clsx(classes.content, {
            [classes.contentShift]: drawerOpen,
            [classes.toolsContentShift]: toolsMenu,
          })}
        >
          <div className={classes.mainContent}>
            <div className={classes.drawerHeader} />
            <Alert closeable={true} severity="warning">UNDER CONSTRUCTION - We are still working and changing the JACDAC specification. Do not build devices using JACDAC.</Alert>
            <WebUSBAlert />
            <Typography className={'markdown'} component="span">
              {children}
            </Typography>
          </div>
          <Footer />
        </main>
      </Container>}
      <FabBar />
    </div>
  </>
  )
}
