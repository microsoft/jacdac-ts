import { Link } from "gatsby-theme-material-ui"
import React, { useContext } from "react"
import CodeBlock from "./CodeBlock"

export default function Snippet(props: {
    value: string,
    mode?: string,
    download?: string;
}) {
    const { value, mode, download } = props
    const className = mode && `language-${mode}`
    const valueUri = `data:application/json;charset=UTF-8,${encodeURIComponent(value)}`
    return <>
        {download && <Link href={valueUri} download={download}>Download</Link>}
        <CodeBlock className={className}>{value}</CodeBlock>
    </>
}