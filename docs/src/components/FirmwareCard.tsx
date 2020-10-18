import React, { useEffect, useState } from "react"
import { Button, Card, CardHeader, CardActions, CircularProgress, CardContent, Chip, ListItem, List, ListItemText, Typography } from "@material-ui/core";
import { fetchLatestRelease, fetchReleaseBinary, GithubRelease, normalizeSlug } from "./github";
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
    const [error, setError] = useState("")
    const { setFirmwareFile, firmwareBlobs } = useFirmwareBlob(slug)
    const tag = release?.tag_name;
    const disabled = downloading;
    const version = firmwareBlobs?.[0].version
    const updateAvailable = !!tag && !!version && tag.slice(1) !== version.substr(0, tag.length - 1)
    const isGithubRepo = slug !== LOCAL_FILE_SLUG
    const indeterminate = downloading && !isGithubRepo
    const downloadColor = updateAvailable ? "primary" : "inherit"
    const downloadVariant = updateAvailable ? "contained" : "text"

    useEffectAsync(async (mounted) => {
        if (slug == LOCAL_FILE_SLUG || !mounted())
            return;
        try {
            setError("")
            setDownloading(true)
            const rel = await fetchLatestRelease(slug)
            if (mounted())
                setRelease(rel)
        } catch (e) {
            setError(e.message)
        }
        finally {
            setDownloading(false)
        }
    }, [slug]);

    const handleFiles = async (files: File[]) => {
        const file = files[0]
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
            setError("")
            setDownloading(true)
            const firmware = await fetchReleaseBinary(slug, tag);
            if (firmware)
                setFirmwareFile(tag, firmware)
        }
        finally {
            setDownloading(false)
        }
    }
    const handleClear = async () => {
        try {
            setError("")
            setDownloading(true)
            setFirmwareFile(tag, undefined)
        }
        finally {
            setDownloading(false)
        }
    }

    return <Card>
        <CardHeader
            title={isGithubRepo ? <Link color="textPrimary" target="_blank" to={`https://github.com/${slug}`}>{normalizeSlug(slug)}</Link> : slug}
            subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>} />
        <CardContent>
            {error && <Alert severity="error">{error}</Alert>}
            {version && <Typography variant="body2">version <code>{version}</code></Typography>}
            {updateAvailable && isGithubRepo && <Alert severity="info">Update available.</Alert>}
            {!!firmwareBlobs?.length && <List dense>
                {firmwareBlobs.map(blob => <ListItem key={blob.deviceClass}>
                    <ListItemText primary={blob.name} secondary={`0x${blob.deviceClass.toString(16)}`} />
                </ListItem>)}
            </List>}
        </CardContent>
        <CardActions>
            {!downloading && release && isGithubRepo && <Button disabled={downloading} color={downloadColor} variant={downloadVariant} aria-label={`Download last release from ${slug}`} onClick={handleGitHubReleaseDownload}>
                Download
            </Button>}
            {!downloading && !isGithubRepo && <UploadButton text={"Import UF2 file"} onFilesUploaded={handleFiles} />}
            {!downloading && firmwareBlobs?.length && <Button disabled={disabled} variant="text" arial-label={"Clear"} onClick={handleClear}>
                Clear
            </Button>}
            {indeterminate && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
        </CardActions>
    </Card>
}