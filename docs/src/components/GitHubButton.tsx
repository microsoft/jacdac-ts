// tslint:disable-next-line: match-default-export-name no-submodule-imports
import GitHubIcon from '@material-ui/icons/GitHub';
import { IconButton } from 'gatsby-theme-material-ui';
import React from "react";

export default function GitHubButton(props: { repo: string, size?: "small" | "medium" }) {
    const { repo, size } = props;
    let url = repo;
    if (!/^https:\/\// && !/^https:\/\/github.com\//.test(url)) {
        url = "https://github.com/" + repo;
    }
    return <IconButton to={url} size={size}>
        <GitHubIcon />
    </IconButton>;
}