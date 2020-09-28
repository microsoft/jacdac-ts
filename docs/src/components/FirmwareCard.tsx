import React, { useEffect, useState } from "react"
import { Button, Card, CardHeader, CardActions, CircularProgress, CardContent, Chip, ListItem, List, ListItemText } from "@material-ui/core";
import { fetchLatestRelease, GithubRelease } from "./github";
import useEffectAsync from "./useEffectAsync";
import { Link } from "gatsby-theme-material-ui";
import { useFirmwareBlob } from "./useFirmwareBlobs";
import Alert from "./Alert";
import UploadButton from "./UploadButton";

export const LOCAL_FILE_SLUG = "local file";

export default function FirmwareCard(props: { slug: string }) {
    const { slug } = props
    const [release, setRelease] = useState<GithubRelease>(undefined)
    const [downloading, setDownloading] = useState(false)
    const { setFirmwareFile, firmwareBlobs } = useFirmwareBlob(slug)
    const tag = release?.tag_name;
    const disabled = downloading;
    const version = firmwareBlobs?.[0].version
    const updated = !!tag && !!version && tag.slice(1) === version.substr(0, tag.length - 1)
    const isGithubRepo = slug !== LOCAL_FILE_SLUG
    const indeterminate = downloading && !isGithubRepo
    const downloadColor = updated ? "inherit" : "primary"
    const downloadVariant = updated ? "text" : "contained"

    useEffectAsync(async (mounted) => {
        const rel = await fetchLatestRelease(slug)
        if (mounted())
            setRelease(rel)
    }, [slug]);

    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setDownloading(true)
                await setFirmwareFile(undefined, file)
            } finally {
                setDownloading(false)
            }
        }
    }

    const handleGitHubReleaseDownload = async () => {
        try {
            setDownloading(true)
            const downloadUrl = `https://raw.githubusercontent.com/${slug}/${tag}/dist/firmware.uf2`
            const req = await fetch(downloadUrl, { headers: { "Accept": "application/octet-stream" } })
            if (req.status == 200) {
                const firmware = await req.blob()
                setFirmwareFile(tag, firmware)
            }
        }
        finally {
            setDownloading(false)
        }
    }
    const handleClear = async () => {
        try {
            setDownloading(true)
            setFirmwareFile(tag, undefined)
        }
        finally {
            setDownloading(false)
        }
    }

    return <Card>
        <CardHeader
            title={isGithubRepo ? <Link color="textPrimary" target="_blank" to={`https://github.com/${slug}`}>{slug}</Link> : slug}
            subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>} />
        <CardContent>
            {(version && !updated) && <Chip label={version} />}
            {updated && <Alert severity="success">Up to date!</Alert>}
            {!!firmwareBlobs?.length && <List dense>
                {firmwareBlobs.map(blob => <ListItem key={blob.deviceClass}>
                    <ListItemText primary={blob.name} secondary={blob.deviceClass} />
                </ListItem>)}
                </List>}
        </CardContent>
        <CardActions>
            {!downloading && release && isGithubRepo && <Button disabled={downloading} color={downloadColor} variant={downloadVariant} aria-label={`Download last release from ${slug}`} onClick={handleGitHubReleaseDownload}>
                Download
            </Button>}
            {!downloading && !isGithubRepo && <UploadButton text={"Import UF2 file"} accept=".uf2" onFilesUploaded={handleFiles} />}
            {!downloading && <Button disabled={disabled} variant="text" arial-label={"Clear"} onClick={handleClear}>
                Clear
            </Button>}
            {indeterminate && <CircularProgress size="1rem" />}
        </CardActions>
    </Card>
}