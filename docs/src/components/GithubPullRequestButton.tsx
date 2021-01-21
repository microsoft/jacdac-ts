import React, { useContext, useState } from "react"
import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";
import { Button, Link } from "gatsby-theme-material-ui";
import { CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, Typography } from "@material-ui/core";
import AppContext from "./AppContext";
import { GITHUB_API_KEY } from "./github";
import useDbValue from "./useDbValue";
import { useSnackbar } from "notistack";
import Alert from "./ui/Alert";
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
    const [confirmDialog, setConfirmDialog] = useState(false);

    const disabled = busy || !token || !commit || !title || !body || !head || !files || !Object.keys(files).length

    const handleOpenConfirm = () => setConfirmDialog(true);
    const handleCloseConfirm = () => setConfirmDialog(false)

    const handleCreatePullRequest = async () => {
        enqueueSnackbar("creating pull request...");
        setBusy(true);
        setConfirmDialog(false);
        try {
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
                const url = result.data.html_url;
                const id = result.data.number;
                enqueueSnackbar(<Typography component="span">
                    Pull Request <Link target="_blank" rel="no-referrer no-follower" href={url}>#{id}</Link> created...
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

    return <>
        <Button disabled={busy} color="primary" variant="contained" onClick={handleOpenConfirm} startIcon={<GitHubIcon />}>
            {label || "Create Pull Request"}
            {busy && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
        </Button>
        {response && <Alert severity="success">
            Pull Request <Link href={response.html_url}>#{response.number}</Link> created.
            </Alert>}
        <Dialog open={confirmDialog} onClose={handleCloseConfirm}>
            <DialogContent>
                <DialogContentText>
                    We will open a new Pull Request for your service? If needed, we will fork <code>microsoft/jacdac</code> under your account and create a Pull Request in that repository.
                </DialogContentText>
                <ApiKeyAccordion
                    apiName={GITHUB_API_KEY}
                    title="GitHub Developer Token"
                    instructions={
                        <Typography component="span" variant="caption">
                            Open <a target="_blank" href="https://github.com/settings/tokens/new" rel="noreferrer nofollower">https://github.com/settings/tokens/new</a> and generate a new personal access token with **repo** scope.
                            </Typography>
                    }
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCreatePullRequest} disabled={disabled} aria-label="create pull request">create pull request</Button>
            </DialogActions>
        </Dialog>
    </>
}
