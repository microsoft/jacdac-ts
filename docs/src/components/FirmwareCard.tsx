import React, { useState } from "react"
import { Button, Card, CardHeader, CardActions, CircularProgress, CardContent, ListItem, List, ListItemText, Typography } from "@material-ui/core";
import { fetchReleaseBinary, normalizeSlug, useLatestRelease } from "./github";
import { Link } from "gatsby-theme-material-ui";
import { useFirmwareBlob } from "./useFirmwareBlobs";
import Alert from "./Alert";

export default function FirmwareCard(props: { slug: string }) {
    const { slug } = props
    const { response: release } = useLatestRelease(slug);
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState("")
    const { setFirmwareFile, firmwareBlobs } = useFirmwareBlob(slug)
    const tag = release?.tag_name;
    const disabled = downloading;
    const version = firmwareBlobs?.[0].version
    const updateAvailable = !!tag && !!version && tag.slice(1) !== version.substr(0, tag.length - 1)
    const downloadColor = updateAvailable ? "primary" : "inherit"
    const downloadVariant = updateAvailable ? "contained" : "text"

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
            title={<Link color="textPrimary" target="_blank" to={`https://github.com/${slug}`}>{normalizeSlug(slug)}</Link>}
            subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>} />
        <CardContent>
            {error && <Alert severity="error">{error}</Alert>}
            {version && <Typography variant="body2">version <code>{version}</code></Typography>}
            {updateAvailable && <Alert severity="info">Update available.</Alert>}
            {!!firmwareBlobs?.length && <List dense>
                {firmwareBlobs.map(blob => <ListItem key={blob.firmwareIdentifier}>
                    <ListItemText primary={blob.name} secondary={`0x${blob.firmwareIdentifier.toString(16)}`} />
                </ListItem>)}
            </List>}
        </CardContent>
        <CardActions>
            {!downloading && release && <Button disabled={downloading} color={downloadColor} variant={downloadVariant} aria-label={`Download last release from ${slug}`} onClick={handleGitHubReleaseDownload}>
                Download
            </Button>}
            {!downloading && firmwareBlobs?.length && <Button disabled={disabled} variant="text" arial-label={"Clear"} onClick={handleClear}>
                Clear
            </Button>}
            {downloading && <CircularProgress disableShrink variant="indeterminate" size="1rem" />}
        </CardActions>
    </Card>
}