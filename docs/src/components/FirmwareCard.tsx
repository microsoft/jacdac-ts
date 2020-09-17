import React, { useEffect, useState } from "react"
import { Button, Card, CardHeader, CardActions, CircularProgress, CardContent } from "@material-ui/core";
import { fetchLatestRelease, GithubRelease } from "./github";
import useEffectAsync from "./useEffectAsync";
import { Link } from "gatsby-theme-material-ui";
import useFirmwareBlobs from "./useFirmwareBlobs";

export default function FirmwareCard(props: { slug: string }) {
    const { slug } = props
    const [release, setRelease] = useState<GithubRelease>(undefined)
    const [downloading, setDownloading] = useState(false)
    const { setFirmwareBlob } = useFirmwareBlobs()
    const tag = release?.tag_name;

    useEffectAsync(async (mounted) => {
        const rel = await fetchLatestRelease(slug)
        if (mounted())
            setRelease(rel)
    }, [slug]);
    const handleDownload = async () => {
        try {
            setDownloading(true)
            const downloadUrl = `https://raw.githubusercontent.com/${slug}/${tag}/dist/firmware.uf2`
            const req = await fetch(downloadUrl, { headers: { "Accept": "application/octet-stream" } })
            if (req.status == 200) {
                const firmware = await req.blob()
                setFirmwareBlob(slug, tag, firmware)
            }
        }
        finally {
            setDownloading(false)
        }
    }

    return <Card>
        <CardHeader
            title={<Link color="textPrimary" target="_blank" to={`https://github.com/${slug}`}>{slug}</Link>}
            subheader={release && <Link color="textSecondary" target="_blank" to={release.html_url}>{release.name}</Link>} />
        <CardContent>
            {!release && <CircularProgress />}
        </CardContent>
        <CardActions>
            {release && <Button disabled={downloading} variant="outlined" aria-label={`Download last release from ${slug}`} onClick={handleDownload}>
                Download
            </Button>}
            {downloading && <CircularProgress size="1rem" />}
        </CardActions>
    </Card>
}