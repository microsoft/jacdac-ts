import React, { useContext, useState } from "react"
import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";
import { Button, Link } from "gatsby-theme-material-ui";
import { CircularProgress, Typography } from "@material-ui/core";
import AppContext from "./AppContext";
import { GITHUB_API_KEY } from "./github";
import useDbValue from "./useDbValue";
import { useSnackbar } from "notistack";
import { useConfirm } from 'material-ui-confirm';
import Alert from "./Alert";
import GitHubIcon from '@material-ui/icons/GitHub';
import ApiKeyAccordion from "./ApiKeyAccordion";

export default function GithubPullRequestButton(props: {
    title: string,
    label?: string;
    body: string,
    head: string,
    commit: string,
    files: { [path: string]: string | { content: string; encoding: "utf-8" | "base64"; } }
}) {
    const { commit, files, label, title, body, head } = props;
    const { value: token } = useDbValue(GITHUB_API_KEY, "")
    const [response, setResponse] = useState(undefined);
    const [busy, setBusy] = useState(false)
    const { setError: setAppError } = useContext(AppContext)
    const { enqueueSnackbar } = useSnackbar();
    const confirm = useConfirm();

    const disabled = busy || !token || !commit || !title || !body || !head || !files || !Object.keys(files).length
    const handleClick = async () => {
        try {
            await confirm({
                title: "Submit module?",
                description: <>
                    <p>Submit your module as a new pull request in https://github.com/microsoft/jacdac?</p>
                    <ApiKeyAccordion
                        apiName={GITHUB_API_KEY}
                        title="GitHub Developer Token"
                        instructions={
                            <p>Open <a target="_blank" href="https://github.com/settings/tokens/new" rel="noreferrer nofollower">https://github.com/settings/tokens/new</a> and generate a new personal access token with **repo** scope.</p>
                        }
                    />
                </>
            });
        } catch (e) {
            return;
        }

        try {
            setBusy(true);
            const MyOctokit = Octokit.plugin(createPullRequest);
            const octokit = new MyOctokit({
                auth: token,
            });

            // Returns a normal Octokit PR response
            // See https://octokit.github.io/rest.js/#octokit-routes-pulls-create
            const result = await octokit.createPullRequest({
                owner: "microsoft",
                repo: "jacdac",
                title,
                body,
                head,
                changes: [
                    {
                        files,
                        commit,
                    },
                ],
            })

            if (result.status === 201) {
                setResponse(result.data)
                const url = result.data.url;
                enqueueSnackbar(<Typography component="span">
                    Pull Request created...
                </Typography>, {
                    variant: "success"
                })
            } else {
                setResponse(undefined);
            }
        } catch (e) {
            setAppError(e)
        } finally {
            setBusy(false)
        }
    }

    return <><Button color="primary" variant="contained" onClick={handleClick}
        disabled={disabled} startIcon={<GitHubIcon />}>
        {label || "Create Pull Request"}
        {busy && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
    </Button>
        {response && <Alert severity="success">
            Pull Request <Link href={response.url}>#{response.number}</Link> created.
            </Alert>}
    </>
}
