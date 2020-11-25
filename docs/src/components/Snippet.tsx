import { IconButton } from "@material-ui/core"
import { Link } from "gatsby-theme-material-ui"
import React, { useContext } from "react"
import CodeBlock from "./CodeBlock"

export default function Snippet(props: {
    value: string,
    mode?: string,
    download?: string;
    url?: string;
}) {
    const { value, mode, download, url } = props
    const className = mode && `language-${mode}`
    return <CodeBlock className={className} downloadName={download} downloadText={download && value} url={url}>{value}</CodeBlock>
}