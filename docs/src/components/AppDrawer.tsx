import React, { useContext } from "react";
import { Drawer, Typography, Divider, makeStyles, createStyles, useMediaQuery, useTheme } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import PacketList from "./PacketList";
import Toc from "./Toc";
import DomTreeView from "./DomTreeView";
import { DRAWER_WIDTH, MOBILE_BREAKPOINT, MOBILE_DRAWER_WIDTH } from "./layout";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import AppContext, { drawerTitle, DrawerType } from "./AppContext";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
import ConnectButton from "../jacdac/ConnectButton";
import { useStaticQuery, graphql } from "gatsby";
import Mdx from "./Mdx";
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec";
import PacketsContext from "./PacketsContext";
import PacketRecorder from "./PacketRecorder";
import DrawerSearchInput from "./DrawerSearchInput";
import { useDrawerSearchResults } from "./useDrawerSearchResults";
import DrawerSearchResults from "./DrawerSearchResults";

const useStyles = makeStyles((theme) => createStyles({
    drawer: {
        width: `${DRAWER_WIDTH}rem`,
        flexShrink: 0,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `${MOBILE_DRAWER_WIDTH}rem`,
        }
    },
    drawerPaper: {
        width: `${DRAWER_WIDTH}rem`,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `${MOBILE_DRAWER_WIDTH}rem`,
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
    pagePath: string,
    serviceClass?: number
}) {
    const { pagePath } = props
    const theme = useTheme()
    const classes = useStyles()
    const { serviceClass: globalServiceClass } = useContext(PacketsContext)
    const serviceClass = props.serviceClass !== undefined ? props.serviceClass : globalServiceClass;
    const { drawerType, setDrawerType } = useContext(AppContext)
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const open = drawerType !== DrawerType.None
    const connected = connectionState == BusState.Connected
    const alertConnection = !connected &&
        (drawerType == DrawerType.Dom || drawerType == DrawerType.Packets)
    const service = serviceClass !== undefined
        && serviceSpecificationFromClassIdentifier(serviceClass)
    const searchResults = useDrawerSearchResults()
    const showSearchResults = !!searchResults;
    const showTitle = useMediaQuery(theme.breakpoints.up('md'))
    const query = useStaticQuery(graphql`
        {
          allFile(filter: {name: {eq: "service-spec-language"}}) {
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

    return <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
            paper: classes.drawerPaper,
        }}
    >
        <div className={classes.drawerHeader}>
            {drawerType !== DrawerType.Toc && <PacketRecorder />}
            {showTitle && <Typography variant="h6">{drawerTitle(drawerType)}</Typography>}
            {drawerType == DrawerType.Toc && <div className={classes.fluid}><DrawerSearchInput /></div>}
            {drawerType === DrawerType.Packets && serviceClass !== undefined
                && <Alert className={classes.alertButton} severity="info">{`Filtered for ${service?.name || serviceClass.toString(16)}`}</Alert>}
            <IconButton onClick={handleDrawerClose}>
                <ChevronLeftIcon />
            </IconButton>
        </div>
        <Divider />
        {showSearchResults && <DrawerSearchResults results={searchResults} />}
        {!showSearchResults && drawerType === DrawerType.Toc && <Toc />}
        {!showSearchResults && drawerType == DrawerType.ServiceSpecification && <div className={classes.mdx}><Mdx mdx={specMarkdown} /></div>}
        {!showSearchResults && drawerType === DrawerType.Packets
            ? <PacketList serviceClass={serviceClass} />
            : drawerType === DrawerType.Dom ? <DomTreeView /> : undefined}
    </Drawer>
}