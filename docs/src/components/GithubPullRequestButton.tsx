import React, { useContext, useState } from "react"
import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";
import { Button, Link } from "gatsby-theme-material-ui";
import { CircularProgress } from "@material-ui/core";
import AppContext from "./AppContext";

export function GithubPullRequestButton(props: {
    token: string,
    title: string,
    body: string,
    head: string,
    comment: string,
    files: { [path: string]: string | { content: string; encoding: "utf-8" | "base64"; } }
}) {
    const { token, comment, files, title, body, head } = props;
    const [busy, setBusy] = useState(false)
    const { setError: setAppError } = useContext(AppContext)

    const disabled = busy || !token || !comment || !title || !body || !head || !Object.keys(files).length
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
                        commit: comment,
                    },
                ],
            })

            console.log({ result })
        } catch (e) {
            setAppError(e)
        } finally {
            setBusy(false)
        }
    }

    return <Button onClick={handleClick} disabled={disabled}>
        Create Pull Request
        {busy && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
    </Button>
}
