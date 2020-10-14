// tslint:disable-next-line: match-default-export-name no-submodule-imports
import { Tooltip } from '@material-ui/core';
import GitHubIcon from '@material-ui/icons/GitHub';
import { IconButton } from 'gatsby-theme-material-ui';
import React from "react";

export default function GitHubButton(props: { repo: string, size?: "small" | "medium", className?: string }) {
    const { repo, size, className } = props;
    let url = repo;
    if (!/^https:\/\//.test(url) && !/^https:\/\/github.com\//.test(url)) {
        url = "https://github.com/" + url;
    }
    return <Tooltip title={`open ${url}`} className={className}>
        <span>
            <IconButton to={url} size={size} color="inherit" edge="start">
                <GitHubIcon />
            </IconButton>
        </span>
    </Tooltip>;
}