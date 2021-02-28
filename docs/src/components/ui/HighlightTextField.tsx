/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-key */
import React, { useContext, useRef } from "react"
import Highlight, {
    defaultProps,
    Language,
    PrismTheme,
} from "prism-react-renderer"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import LIGHT_THEME from "prism-react-renderer/themes/github"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DARK_THEME from "prism-react-renderer/themes/vsDark"
import DarkModeContext from "./DarkModeContext"
import { useEditable } from "use-editable"
export interface Annotation {
    line: number
    column: number
    text: string
    type: "error" | "warning"
}

export default function HighlightTextField(props: {
    language: string
    code: string
    onChange: (newValue: string) => void
    annotations?: Annotation[]
}) {
    const { code, onChange, language, annotations } = props
    const { darkMode } = useContext(DarkModeContext)
    const theme = (darkMode === "dark" ? DARK_THEME : LIGHT_THEME) as PrismTheme
    const editorRef = useRef(null)

    useEditable(editorRef, onChange, {
        disabled: false,
        indentation: 4,
    })
    const annots = annotations?.slice(0, 1)

    return (
        <Highlight
            {...defaultProps}
            code={code}
            language={language as Language}
            theme={theme}
        >
            {({ className, style, tokens, getTokenProps }) => (
                <pre
                    ref={editorRef}
                    className={className}
                    spellCheck={false}
                    style={{
                        ...style,
                        ...{ minHeight: "12rem", whiteSpace: "pre-wrap" },
                    }}
                >
                    {tokens.map((line, i) => {
                        const annotation = annots?.find(a => a.line === i + 1)
                        return (
                            <span
                                key={i}
                                title={annotation?.text}
                                style={
                                    annotation && {
                                        border: "solid 1px red",
                                        backgroundColor: "rgba(255, 0, 0, 0.2)",
                                    }
                                }
                            >
                                {line
                                    .filter(token => !token.empty)
                                    .map((token, key) => (
                                        <span
                                            {...getTokenProps({
                                                token,
                                                key,
                                            })}
                                        />
                                    ))}
                                {i < tokens.length - 1 ? "\n" : null}
                            </span>
                        )
                    })}
                </pre>
            )}
        </Highlight>
    )
}
