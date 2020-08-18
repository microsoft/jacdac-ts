import React from "react"
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools"

export default function Snippet(props: {
    value: string,
    mode?: "markdown" | "json" | "javascript"
}) {
    const { mode, value } = props

    return <AceEditor
        mode={mode}
        theme="github"
        value={value}
        wrapEnabled={true}
        showGutter={false}
        showPrintMargin={false}
        width="100%"
    />
}