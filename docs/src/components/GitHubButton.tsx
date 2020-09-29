import { IconButton, IconButtonProps } from "@material-ui/core";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import GitHubIcon from '@material-ui/icons/GitHub';
import React from "react";

export default function GitHubButton(props: { slug: string, size: "small" | "medium" }) {
    const { slug, size } = props;
    return <IconButton href={`https://github.com/${slug}`} size={size}>
        <GitHubIcon />
    </IconButton>
}