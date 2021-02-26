/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-key */
import React, { useContext, useRef } from 'react'
import Highlight, { defaultProps, Language, PrismTheme } from 'prism-react-renderer'
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import LIGHT_THEME from 'prism-react-renderer/themes/github';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DARK_THEME from 'prism-react-renderer/themes/vsDark';
import DarkModeContext from './DarkModeContext';
import { useEditable } from "use-editable"

export default function HighlightTextField(props: {
    language: string,
    code: string,
    onChange: (newValue: string) => void
}) {
    const { code, onChange, language } = props;
    const { darkMode } = useContext(DarkModeContext)
    const theme = (darkMode === "dark" ? DARK_THEME : LIGHT_THEME) as PrismTheme;
    const editorRef = useRef(null);

    useEditable(editorRef, onChange, {
        disabled: false,
        indentation: 4
    });

    return (
        <Highlight {...defaultProps}
            code={code}
            language={language as Language}
            theme={theme}
        >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre ref={editorRef} className={className} spellCheck={false} style={{ ...style, ...{ minHeight: "12rem" } }}>
                    {tokens.map((line, i) => (
                        <React.Fragment key={i}>
                            {line
                                .filter((token) => !token.empty)
                                .map((token, key) => (
                                    <span {...getTokenProps({ token, key })} />
                                ))}
                            {i < tokens.length - 1 ? "\n" : null}
                        </React.Fragment>
                    ))}
                </pre>
            )}
        </Highlight>
    )
}