/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React, { useContext } from "react"
import clsx from 'clsx';
import { makeStyles, Container, Hidden } from '@material-ui/core';
// tslint:disable-next-line: no-submodule-imports
import { Link, IconButton } from 'gatsby-theme-material-ui';
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
import SettingsBrightnessIcon from '@material-ui/icons/SettingsBrightness';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import MoreIcon from '@material-ui/icons/MoreVert';
import { useStaticQuery, graphql } from "gatsby"
import JACDACProvider from "../jacdac/Provider"
import ErrorSnackbar from "./ErrorSnackbar"
// tslint:disable-next-line: no-import-side-effect
import "./layout.css"
import { PacketsProvider } from "./PacketsContext";
import SEO from "./seo";
import { DbProvider } from "./DbContext";
import FlashButton from "./FlashButton";
// tslint:disable-next-line: no-submodule-imports
import { createMuiTheme, responsiveFontSizes, ThemeProvider, createStyles } from '@material-ui/core/styles';
import DrawerContext, { DrawerProvider, DrawerType } from "./DrawerContext";
import AppDrawer from "./AppDrawer";
import WebUSBAlert from "./WebUSBAlert";
import useFirmwareBlobs from "./useFirmwareBlobs";
import { MDXProvider } from "@mdx-js/react";
import CodeDemo from "./CodeBlock";
import { ServiceManagerProvider } from "./ServiceManagerContext";
import DarkModeProvider from "./DarkModeProvider";
import DarkModeContext from "./DarkModeContext";
import ToolsDrawer from "./ToolsDrawer";
import Helmet from "react-helmet";

export const DRAWER_WIDTH = `${40}rem`;
export const TOOLS_DRAWER_WIDTH = `${18}rem`;

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
    width: `calc(100% - ${DRAWER_WIDTH})`,
    marginLeft: DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: theme.spacing(1),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    width: DRAWER_WIDTH,
    flexShrink: 0,
  },
  drawerPaper: {
    width: DRAWER_WIDTH,
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
    flexDirection: 'column',
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${DRAWER_WIDTH}`,
  },
  mainContent: {
    flexGrow: 1
  },
  contentShift: {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
  footer: {
    marginTop: theme.spacing(3)
  },
  footerLink: {
    marginRight: theme.spacing(0.5)
  }
}));

export default function Layout(props: { pageContext?: any; children: any; }) {
  return <DarkModeProvider>
    <LayoutWithDarkMode {...props} />
  </DarkModeProvider>
}

function LayoutWithDarkMode(props: { pageContext?: any; children: any; }) {
  const { darkMode, darkModeMounted } = useContext(DarkModeContext)
  if (!darkModeMounted)
    return <div />

  const theme = responsiveFontSizes(createMuiTheme({
    palette: {
      type: darkMode
    }
  }));
  const mdxComponents = {
    CodeDemo: (props: any) => <CodeDemo {...props} />,
    Link: (props: any) => <Link color="textPrimary" {...props} />,
    a: (props: any) => <Link color="textPrimary" {...props} />
  };

  return (
    <ThemeProvider theme={theme}>
      <MDXProvider components={mdxComponents}>
        <JACDACProvider>
          <ServiceManagerProvider>
            <PacketsProvider>
              <DbProvider>
                <DrawerProvider>
                  <LayoutWithContext {...props} />
                </DrawerProvider>
              </DbProvider>
            </PacketsProvider>
          </ServiceManagerProvider>
        </JACDACProvider>
      </MDXProvider>
    </ThemeProvider>
  )
}


function LayoutWithContext(props: {
  pageContext?: any;
  children: any;
}) {
  const { toggleDarkMode } = useContext(DarkModeContext)
  const { pageContext, children, } = props;
  const classes = useStyles();
  const { drawerType, setDrawerType, toolsMenu, setToolsMenu } = useContext(DrawerContext)
  const open = drawerType !== DrawerType.None
  const serviceClass = pageContext?.node?.classIdentifier;
  const pageTitle = pageContext?.frontmatter?.title
  useFirmwareBlobs()

  const handleDrawerToc = () => {
    setDrawerType(DrawerType.Toc)
  }
  const handleDrawerConsole = () => {
    setDrawerType(DrawerType.Packets);
  }
  const handleDrawerDom = () => {
    setDrawerType(DrawerType.Dom);
  }
  const handleDarkMode = () => toggleDarkMode()
  const toggleToolsMenu = () => setToolsMenu(!toolsMenu)

  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
        }
      }
      allJacdacTsJson {
        nodes {
          version
        }
      }
    }
  `)

  return (
    <div className={classes.root}>
      <SEO />
      <CssBaseline />
      <Helmet>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
      </Helmet>
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
            aria-label="open DOM tree"
            onClick={handleDrawerDom}
            edge="start"
            className={clsx(classes.menuButton, open && classes.hide)}
          > <AccountTreeIcon />
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
          {pageTitle && pageTitle !== "JACDAC" && <Hidden mdDown={true}>
            <Typography variant="h5">
              {"/"} {pageTitle}
            </Typography>
          </Hidden>}
          <div className={classes.grow} />
          <div className={clsx(classes.menuButton)}><ConnectButton /></div>
          <div className={clsx(classes.menuButton, open && classes.hide)}><FlashButton /></div>
          <IconButton color="inherit" className={clsx(classes.menuButton, open && classes.hide)} onClick={handleDarkMode} aria-label="Toggle Dark Mode">
            <SettingsBrightnessIcon />
          </IconButton>
          <IconButton color="inherit" className={clsx(classes.menuButton, open && classes.hide)} onClick={toggleToolsMenu} aria-label="More">
            <MoreIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <AppDrawer pagePath={pageContext?.frontmatter?.path} serviceClass={serviceClass} />
      <ToolsDrawer />
      <Container maxWidth={open ? "lg" : "sm"}>
        <main
          className={clsx(classes.content, {
            [classes.contentShift]: open,
          })}
        >
          <div className={classes.mainContent}>
            <div className={classes.drawerHeader} />
            <WebUSBAlert />
            <Typography component="span">
              {children}
            </Typography>
          </div>
          <footer className={classes.footer}>
            <Link color="textSecondary" className={classes.footerLink} target="_blank" to={`https://github.com/microsoft/jacdac-ts/tree/v${data.allJacdacTsJson.nodes[0].version}`}>JACDAC-TS v{data.allJacdacTsJson.nodes[0].version}</Link>
            <Link color="textSecondary" className={classes.footerLink} to="https://makecode.com/privacy" target="_blank" rel="noopener">Privacy &amp; Cookies</Link>
            <Link color="textSecondary" className={classes.footerLink} to="https://makecode.com/termsofuse" target="_blank" rel="noopener">Terms Of Use</Link>
            <Link color="textSecondary" className={classes.footerLink} to="https://makecode.com/trademarks" target="_blank" rel="noopener">Trademarks</Link>
            <Typography color="textSecondary" component="span" variant="inherit">
              © {new Date().getFullYear()} Microsoft Corporation
            </Typography>
          </footer>
        </main>
      </Container>
      <ErrorSnackbar />
    </div>
  )
}
