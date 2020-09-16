import React, { useContext } from "react"
// tslint:disable-next-line: match-default-export-name
import AceEditor from "react-ace";
import DarkModeContext from "./DarkModeContext"

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
import "ace-builds/src-noconflict/theme-dracula";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/ext-language_tools"

export default function Snippet(props: {
    value: string,
    mode?: string
}) {
    const { darkMode } = useContext(DarkModeContext)
    const { value } = props
    let lmode: string = props.mode;
    if (lmode === "ts")
        lmode = "javascript"
    else if (lmode === "c")
        lmode = "csharp"

    return <AceEditor
            mode={lmode}
            readOnly={true}
            theme={darkMode === 'light' ? 'github' : 'dracula'}
            value={value}
            wrapEnabled={true}
            showGutter={false}
            highlightActiveLine={false}
            showPrintMargin={false}
            width="100%"
        />
}