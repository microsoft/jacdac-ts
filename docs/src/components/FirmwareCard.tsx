import React, { useEffect, useState } from "react"
import { Button, Card, CardHeader, CardActions, CircularProgress, CardContent } from "@material-ui/core";
import { fetchLatestRelease, GithubRelease } from "./github";
import useEffectAsync from "./useEffectAsync";
import { Link } from "gatsby-theme-material-ui";

export default function FirmwareCard(props: { slug: string }) {
    const { slug } = props
    const [release, setRelease] = useState<GithubRelease>(undefined)
    const asset = release?.assets?.find(asset => /\.uf2$/.test(asset.name))

    useEffectAsync(async (mounted) => {
        const rel = await fetchLatestRelease(slug)
        if (mounted())
            setRelease(rel)
    }, [slug]);
    return <Card>
        <CardHeader title={<Link target="_blank" to={`https://github.com/${slug}`}>{slug}</Link>} subheader={release && <Link target="_blank" to={release.html_url}>{release.name}</Link>} />
        <CardContent>
            {!release && <CircularProgress />}
        </CardContent>
        <CardActions>
            {asset && <Button variant="outlined" aria-label={`Download last release from ${slug}`} href={asset.browser_download_url}>Download</Button>}
        </CardActions>
    </Card>
}