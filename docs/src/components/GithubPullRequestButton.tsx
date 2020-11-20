import React, { useContext, useState } from "react"
import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";
import { Button, Link } from "gatsby-theme-material-ui";
import { CircularProgress } from "@material-ui/core";
import AppContext from "./AppContext";
import { GITHUB_API_KEY } from "./github";
import useDbValue from "./useDbValue";
import { useSnackbar } from "notistack";

export default function GithubPullRequestButton(props: {
    title: string,
    body: string,
    head: string,
    commit: string,
    files: { [path: string]: string | { content: string; encoding: "utf-8" | "base64"; } }
}) {
    const { commit, files, title, body, head } = props;
    const { value: token } = useDbValue(GITHUB_API_KEY, "")
    const [busy, setBusy] = useState(false)
    const { setError: setAppError } = useContext(AppContext)
    const { enqueueSnackbar } = useSnackbar();

    const disabled = busy || !token || !commit || !title || !body || !head || !files || !Object.keys(files).length
    const handleClick = async () => {

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
                enqueueSnackbar("pull request created...", {
                    variant: "info"
                })
            }

            console.log({ result })
        } catch (e) {
            setAppError(e)
        } finally {
            setBusy(false)
        }
    }

    return <Button color="primary" variant="contained" onClick={handleClick} disabled={disabled}>
        Create Pull Request
        {busy && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
    </Button>
}
