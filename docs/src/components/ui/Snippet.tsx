import { IconButton, Typography } from "@material-ui/core"
import { Link } from "gatsby-theme-material-ui"
import React, { useContext } from "react"
import CodeBlock from "../CodeBlock"

export default function Snippet(props: {
    value: string,
    mode?: string,
    download?: string;
    url?: string;
    caption?: string | JSX.Element | JSX.Element[];
}) {
    const { value, mode, download, url, caption } = props
    const className = mode && `language-${mode === "sts" ? "ts" : mode}`
    return <>
        <CodeBlock className={className} downloadName={download} downloadText={download && value} url={url}>{value}</CodeBlock>
        {caption && <Typography variant="caption">{caption}</Typography>}
    </>
}