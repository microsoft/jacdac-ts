import React, { useContext } from "react"

export default function Snippet(props: {
    value: string,
    mode?: string
}) {
    const { value } = props

    return <pre>
        <code>
            {value}
        </code>
    </pre>
}