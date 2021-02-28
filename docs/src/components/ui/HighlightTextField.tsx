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
import { Alert } from "@material-ui/lab"
import { Grid } from "@material-ui/core"
import GithubPullRequestButton from "../GithubPullRequestButton"
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
    pullRequestTitle?: string
    pullRequestPath?: string
    pullRequestBody?: string
}) {
    const {
        code,
        onChange,
        language,
        annotations,
        pullRequestTitle,
        pullRequestPath,
        pullRequestBody,
    } = props
    const { darkMode } = useContext(DarkModeContext)
    const theme = (darkMode === "dark" ? DARK_THEME : LIGHT_THEME) as PrismTheme
    const editorRef = useRef(null)

    useEditable(editorRef, onChange, {
        disabled: false,
        indentation: 4,
    })
    return (
        <Grid container spacing={1}>
            <Grid item xs={12}>
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
                                ...{
                                    minHeight: "12rem",
                                    whiteSpace: "pre-wrap",
                                },
                            }}
                        >
                            {tokens.map((line, i) => {
                                const annotation = annotations?.find(
                                    a => a.line === i + 1
                                )
                                return (
                                    <span
                                        key={i}
                                        title={annotation?.text}
                                        style={
                                            annotation && {
                                                borderBottom: "dashed 1px red",
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
            </Grid>
            {pullRequestTitle && pullRequestPath && (
                <Grid item>
                    <GithubPullRequestButton
                        title={pullRequestTitle}
                        head={pullRequestPath}
                        body={pullRequestBody}
                        commit={`added files`}
                        files={{
                            [pullRequestPath + ".md"]: code,
                        }}
                    />
                </Grid>
            )}
            {!!annotations?.length && (
                <Grid item>
                    <Alert severity="warning">
                        <ul>
                            {annotations.map((a, i) => (
                                <li key={i}>
                                    line {a.line}: {a.text}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                </Grid>
            )}
        </Grid>
    )
}
