import React, { useContext } from "react";
import { Drawer, Typography, Divider, makeStyles, createStyles } from "@material-ui/core";
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports
import Alert from "@material-ui/lab/Alert";
import PacketList from "./PacketList";
import Toc from "./Toc";
import DomTreeView from "./DomTreeView";
import { DRAWER_WIDTH } from "./layout";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import DrawerContext, { drawerTitle, DrawerType } from "./DrawerContext";
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
    },
    drawerPaper: {
        width: `${DRAWER_WIDTH}rem`,
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
    const classes = useStyles()
    const { serviceClass: globalServiceClass } = useContext(PacketsContext)
    const serviceClass = props.serviceClass !== undefined ? props.serviceClass : globalServiceClass;
    const { drawerType, setDrawerType } = useContext(DrawerContext)
    const { connectionState } = useContext<JDContextProps>(JACDACContext)
    const open = drawerType !== DrawerType.None
    const connected = connectionState == BusState.Connected
    const alertConnection = !connected &&
        (drawerType == DrawerType.Dom || drawerType == DrawerType.Packets)
    const service = serviceClass !== undefined
        && serviceSpecificationFromClassIdentifier(serviceClass)
    const searchResults = useDrawerSearchResults()
    const hasSearchResults = !!searchResults?.length;
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
            {<Typography variant="h6">{drawerTitle(drawerType)}</Typography>}
            {drawerType == DrawerType.Toc && <div className={classes.fluid}><DrawerSearchInput /></div>}
            {drawerType === DrawerType.Packets && serviceClass !== undefined
                && <Alert className={classes.alertButton} severity="info">{`Filtered for ${service?.name || serviceClass.toString(16)}`}</Alert>}
            <IconButton onClick={handleDrawerClose}>
                <ChevronLeftIcon />
            </IconButton>
        </div>
        <Divider />
        {alertConnection && <Alert severity={"info"}>Connect to a JACDAC device to inspect the bus.
        <ConnectButton className={classes.alertButton} full={true} /></Alert>}
        {hasSearchResults && <DrawerSearchResults results={searchResults} />}
        {!hasSearchResults && drawerType === DrawerType.Toc && <Toc />}
        {!hasSearchResults && drawerType == DrawerType.ServiceSpecification && <div className={classes.mdx}><Mdx mdx={specMarkdown} /></div>}
        {!hasSearchResults && drawerType === DrawerType.Packets
            ? <PacketList serviceClass={serviceClass} />
            : drawerType === DrawerType.Dom ? <DomTreeView /> : undefined}
    </Drawer>
}