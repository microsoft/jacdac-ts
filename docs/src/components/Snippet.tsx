import React, { useContext } from "react"
import CodeBlock from "./CodeBlock"

export default function Snippet(props: {
    value: string,
    mode?: string
}) {
    const { value, mode } = props
    const className = mode && `language-${mode}`

    return <CodeBlock className={className}>{value}</CodeBlock>
}