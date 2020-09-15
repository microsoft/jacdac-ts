import { Link } from "gatsby-theme-material-ui";
import React from "react";
// tslint:disable-next-line: no-submodule-imports
import TreeView from '@material-ui/lab/TreeView';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
// tslint:disable-next-line: no-submodule-imports
import TreeItem from '@material-ui/lab/TreeItem';

import { SearchResult } from "./useDrawerSearchResults";
import { createStyles, ListItemText, makeStyles, Theme } from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: '100%',
            maxWidth: 360,
            backgroundColor: theme.palette.background.paper
        }
    })
);

export default function DrawerSearchResults(props: { results?: SearchResult[] }) {
    const { results } = props
    const classes = useStyles()

    return <TreeView
        className={classes.root}
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
    >
        {results.map(result => <TreeItem
            key={'search' + result.url}
            nodeId={result.url.replace(/\/$/, '')}
            label={<Link to={result.url}>
                <ListItemText primary={result.title} />
            </Link>}>
        </TreeItem>)}
    </TreeView>
}