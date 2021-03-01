/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/jsx-key */
import React, { ChangeEvent, useContext, useRef, useState } from "react"
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
import { Grid, TextField, Tooltip, withStyles } from "@material-ui/core"
import GithubPullRequestButton from "../GithubPullRequestButton"
import { useId } from "react-use-id-hook"

const AnnotationTooltip = withStyles(theme => ({
    arrow: {
        color: theme.palette.error.main,
    },
    tooltip: {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.common.white,
        boxShadow: theme.shadows[1],
        fontSize: theme.typography.body2.fontSize,
    },
}))(Tooltip)

export default function HighlightTextField(props: {
    language: string
    code: string
    onChange: (newValue: string) => void
    annotations?: jdspec.Diagnostic[]
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
    const commitId = useId()
    const [commit, setCommit] = useState("")
    const handleCommitChange = (ev: ChangeEvent<HTMLInputElement>) =>
        setCommit(ev.target.value)

    useEditable(editorRef, onChange, {
        disabled: false,
        indentation: 4,
    })
    return (
        <Grid container spacing={1} direction="row">
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
                                const title = annotation?.message
                                const el = (
                                    <span
                                        key={i}
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
                                return title ? (
                                    <AnnotationTooltip
                                        title={title}
                                        arrow
                                        key={i}
                                    >
                                        {el}
                                    </AnnotationTooltip>
                                ) : (
                                    el
                                )
                            })}
                        </pre>
                    )}
                </Highlight>
            </Grid>
            {pullRequestTitle && pullRequestPath && (
                <>
                    <Grid item xs={12}>
                        <TextField
                            id={commitId}
                            label="commit message"
                            aria-label="Commit message describing the changes"
                            placeholder="Describe your changes"
                            fullWidth={true}
                            value={commit}
                            onChange={handleCommitChange}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <GithubPullRequestButton
                            title={pullRequestTitle}
                            head={pullRequestPath}
                            body={pullRequestBody}
                            commit={commit || `added files`}
                            files={{
                                [pullRequestPath + ".md"]: code,
                            }}
                        />
                    </Grid>
                </>
            )}
            {!!annotations?.length && (
                <Grid item>
                    <Alert severity="error">
                        <ul>
                            {annotations.map((a, i) => (
                                <li key={i}>
                                    line {a.line}: {a.message}
                                </li>
                            ))}
                        </ul>
                    </Alert>
                </Grid>
            )}
        </Grid>
    )
}
