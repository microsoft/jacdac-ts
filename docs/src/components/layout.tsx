/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React, { useContext } from "react"
import clsx from 'clsx';
import { makeStyles, Container, Hidden, Box, Paper, Button } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { Link } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports
// tslint:disable-next-line: no-submodule-imports
import AppBar from '@material-ui/core/AppBar';
// tslint:disable-next-line: no-submodule-imports
import Toolbar from '@material-ui/core/Toolbar';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
import ConnectButton from '../jacdac/ConnectButton';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import MoreIcon from '@material-ui/icons/MoreVert';
import { useStaticQuery, graphql } from "gatsby"
// tslint:disable-next-line: no-import-side-effect
import "./layout.css"
import PacketsContext from "./PacketsContext";
import SEO from "./seo";
import FlashButton from "./FlashButton";
// tslint:disable-next-line: no-submodule-imports
import { createMuiTheme, responsiveFontSizes, createStyles, useTheme } from '@material-ui/core/styles';
import AppContext, { DrawerType } from "./AppContext";
import AppDrawer from "./AppDrawer";
import WebUSBAlert from "./WebUSBAlert";
import useFirmwareBlobs from "./useFirmwareBlobs";
import { MDXProvider } from "@mdx-js/react";
import DarkModeProvider from "./ui/DarkModeProvider";
import DarkModeContext from "./ui/DarkModeContext";
import ToolsDrawer from "./ToolsDrawer";
import Alert from "./ui/Alert"
import GitHubButton from "./GitHubButton"
import Presentation from "./ui/Presentation";
import useMdxComponents from "./useMdxComponents";
import Footer from "./ui/Footer";
import PrintButton from "./ui/PrintButton";
import WebUSBSupported from "./WebUSBSupported";
import PacketInspector from "./PacketInspector"
import DrawerToolsButtonGroup from "./DrawerToolsButtonGroup";
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip";
import WebDiagnostics from "./WebDiagnostics";
import Flags from "../../../src/jdom/flags"
import ThemedLayout from "./ui/ThemedLayout";

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

export interface LayoutProps {
  pageContext?: any;
  children?: JSX.Element | JSX.Element[];
}

export default function Layout(props: LayoutProps) {
  return <DarkModeProvider>
    <LayoutWithDarkMode {...props} />
  </DarkModeProvider>
}

function LayoutWithDarkMode(props: LayoutProps) {
  const { darkMode, darkModeMounted } = useContext(DarkModeContext)
  const rawTheme = createMuiTheme({
    palette: {
      primary: {
        main: '#2e7d32',
      },
      secondary: {
        main: '#ffc400',
      },
      type: darkMode
    }
  })
  const theme = responsiveFontSizes(rawTheme);
  const mdxComponents = useMdxComponents()

  if (!darkModeMounted)
    return <div />

  return <ThemedLayout theme={theme}>
    <MDXProvider components={mdxComponents}>
      <LayoutWithContext {...props} />
    </MDXProvider>
  </ThemedLayout>
}

function MainAppBar(props: LayoutProps) {
  const { pageContext } = props;
  const classes = useStyles();
  const { drawerType, widgetMode, toolsMenu, setToolsMenu } = useContext(AppContext)
  const { darkMode } = useContext(DarkModeContext)
  const drawerOpen = drawerType !== DrawerType.None
  const pageTitle = pageContext?.frontmatter?.title;
  const pageDeck = !!pageContext?.frontmatter?.deck;
  const appBarColor = pageDeck ? "transparent"
    : darkMode === "dark" ? "inherit"
      : widgetMode ? "default" : undefined;

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
      <DrawerToolsButtonGroup className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} showToc={true} showCurrent={true} />
      {!drawerOpen && !toolsMenu && <Hidden implementation="css" mdDown={true}>
        <Typography component="span" variant="h6">
          <Link className={classes.menuButton} href="/jacdac-ts" color="inherit">{title}</Link>
        </Typography>
        {pageTitle && pageTitle !== "JACDAC" &&
          <Typography component="span" variant="h6">
            {"/"} {pageTitle}
          </Typography>}
      </Hidden>}
      <div className={classes.grow} />
      <WebUSBSupported><div className={clsx(classes.menuButton)}><ConnectButton transparent={true} /></div></WebUSBSupported>
      <GitHubButton className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} repo={"/github"} />
      <PrintButton className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} color="inherit" />
      <FlashButton className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} />
      <IconButtonWithTooltip className={clsx(classes.menuButton, drawerOpen && classes.hideMobile)} aria-label="More tools" title="More"
        edge="start" color="inherit" onClick={toggleToolsMenu} >
        <MoreIcon />
      </IconButtonWithTooltip>
    </Toolbar>
  </AppBar></Box>
}

/*
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
*/

function LayoutWithContext(props: LayoutProps) {
  const { pageContext, children, } = props;
  const classes = useStyles();
  const theme = useTheme();
  const { drawerType, toolsMenu } = useContext(AppContext)
  const { selectedPacket, setSelectedPacket } = useContext(PacketsContext)
  useFirmwareBlobs();
  const drawerOpen = drawerType !== DrawerType.None
  const pagePath = pageContext?.frontmatter?.path;
  const pageDeck = !!pageContext?.frontmatter?.deck;

  const handleClearSelectedPacket = () => setSelectedPacket(undefined)

  return (<>
    <div className={classes.root}>
      <SEO />
      <MainAppBar pageContext={pageContext} />
      <AppDrawer pagePath={pagePath} />
      <ToolsDrawer />
      {pageDeck && children && <Presentation>
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
            {Flags.diagnostics && <WebDiagnostics />}
            {selectedPacket &&
              <Paper square>
                <Box p={theme.spacing(0.25)} mb={theme.spacing(0.5)}>
                  <PacketInspector />
                  <Box>
                    <Button aria-label="close packet details" variant="outlined" onClick={handleClearSelectedPacket}>close</Button>
                  </Box>
                </Box>
              </Paper>
            }
            <Typography className={'markdown'} component="span">
              {children}
            </Typography>
          </div>
          <Footer />
        </main>
      </Container>}
    </div>
  </>
  )
}
