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
import Alert from "./ui/Alert"

import { useDrawerSearchResults } from "./useDrawerSearchResults";
import { List, ListItem, ListItemText } from "@material-ui/core";

export default function DrawerSearchResults() {
    const results = useDrawerSearchResults();
    return <List>
        {!results.length && <ListItem><Alert severity="info">no results found</Alert></ListItem>}
        {results.map(result => <Link key={'search' + result.url} to={result.url} aria-label={result.title}>
            <ListItem>
                <ListItemText
                    primaryTypographyProps={({ color: "textPrimary" })}
                    aria-label={result.title}
                    primary={result.title} />
            </ListItem>
        </Link>)}
    </List>
}