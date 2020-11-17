import React, { useContext } from "react";
import { Drawer, Typography, Divider, makeStyles, createStyles, useMediaQuery, useTheme } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports
import PacketList from "./PacketList";
import Toc from "./Toc";
import JDomTreeView from "./JDomTreeView";
import { DRAWER_WIDTH, MOBILE_BREAKPOINT, MOBILE_DRAWER_WIDTH, TOC_DRAWER_WIDTH } from "./layout";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import AppContext, { DrawerType } from "./AppContext";
import { useStaticQuery, graphql } from "gatsby";
import Mdx from "./Mdx";
import PacketRecorder from "./PacketRecorder";
import DrawerSearchInput from "./DrawerSearchInput";
import { useDrawerSearchResults } from "./useDrawerSearchResults";
import DrawerSearchResults from "./DrawerSearchResults";
import DrawerToolsButtonGroup from "./DrawerToolsButtonGroup";

const useStyles = makeStyles((theme) => createStyles({
    drawer: {
        width: `${DRAWER_WIDTH}rem`,
        flexShrink: 0,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `100%`,
        }
    },
    drawerPaper: {
        width: `${DRAWER_WIDTH}rem`,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `100%`,
        }
    },
    tocDrawer: {
        width: `${TOC_DRAWER_WIDTH}rem`,
        flexShrink: 0
    },
    tocDrawerPaper: {
        width: `${TOC_DRAWER_WIDTH}rem`
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
        justifyContent: 'flex-start',
    },
    alertButton: {
        marginLeft: theme.spacing(2)
    },
    mdx: {
        margin: theme.spacing(2)
    },
    fluid: {
        flex: 1
    }
}));

export default function AppDrawer(props: {
    pagePath: string
}) {
    const theme = useTheme()
    const classes = useStyles()
    const { drawerType, setDrawerType } = useContext(AppContext)
    const open = drawerType !== DrawerType.None
    const searchResults = useDrawerSearchResults()
    const showSearchResults = !!searchResults;
    const showConnect = useMediaQuery(theme.breakpoints.down("md"));
    const query = useStaticQuery(graphql`
        {
          allFile(filter: {name: {eq: "service-specification"}}) {
            nodes {
              childMdx {
                body
              }
            }
          }
        }
      `)
    const specMarkdown = query.allFile.nodes[0].childMdx.body

    const handleDrawerClose = () => {
        setDrawerType(DrawerType.None)
    }

    if (drawerType === DrawerType.None)
        return <></>

    const toc = drawerType === DrawerType.Toc;
    const spec = drawerType === DrawerType.ServiceSpecification;
    return <Drawer
        className={toc ? classes.tocDrawer : classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
            paper: toc ? classes.tocDrawerPaper : classes.drawerPaper,
        }}
    >
        <div className={classes.drawerHeader}>
            {toc && <div className={classes.fluid}><DrawerSearchInput /></div>}
            {!toc && !spec && <><PacketRecorder />
                <span className={classes.fluid} />
                <DrawerToolsButtonGroup showConnect={showConnect} />
            </>}
            {spec && <span className={classes.fluid} />}
            <IconButton onClick={handleDrawerClose}>
                <ChevronLeftIcon />
            </IconButton>
        </div>
        <Divider />
        {showSearchResults && <DrawerSearchResults results={searchResults} />}
        {!showSearchResults && drawerType === DrawerType.Toc && <Toc />}
        {!showSearchResults && drawerType == DrawerType.ServiceSpecification && <div className={classes.mdx}><Mdx mdx={specMarkdown} /></div>}
        {!showSearchResults && drawerType === DrawerType.Packets
            ? <PacketList showTime={true} />
            : drawerType === DrawerType.Dom ? <JDomTreeView /> : undefined}
    </Drawer>
}