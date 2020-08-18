import React from "react"
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools"

export default function Snippet(props: {
    value: string,
    mode?: string
}) {
    const { value } = props
    let lmode: string = props.mode;
    if (lmode === "ts")
        lmode = "javascript"
    else if (lmode === "c")
        lmode = "csharp"

    return <AceEditor
            mode={lmode}
            readOnly={true}
            theme="github"
            value={value}
            wrapEnabled={true}
            showGutter={false}
            showPrintMargin={false}
            width="100%"
        />
}