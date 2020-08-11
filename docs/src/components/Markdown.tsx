import React from "react"
import ReactMarkdown from 'react-markdown'

export default function Markdown(props: { source: string }) {
    const { source } = props;

    return <ReactMarkdown source={source} />
}