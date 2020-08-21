import React from "react"
import AceEditor from "react-ace";

//import "ace-builds/webpack-resolver";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-markdown";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-json";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-javascript";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-csharp";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/theme-github";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
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
            highlightActiveLine={false}
            showPrintMargin={false}
            width="100%"
        />
}