const ROOT = "https://api.github.com/"

export interface GithubRelease {
    url: string,
    html_url: string,
    tag_name: string,
    name: string,
    body: string,
    assets: {
        url: string,
        browser_download_url: string,
        name: string
    }[]
}

export async function fetchLatestRelease(slug: string, options?: { ignoreThrottled?: boolean }): Promise<GithubRelease> {
    const uri = `${ROOT}repos/${slug}/releases/latest`;
    const resp = await fetch(uri)
    //    console.log(resp)
    switch (resp.status) {
        case 200:
        case 204:
            const release: GithubRelease = await resp.json()
            return release;
        case 404:
            // unknow repo or no access
            return undefined;
        case 403:
            // throttled
            if (options?.ignoreThrottled)
                return undefined;
            throw new Error("Too many calls to GitHub, try again later");
    }
    throw new Error(`unknown status code ${resp.status}`)
}

export async function fetchReleaseBinary(slug: string, tag: string): Promise<Blob> {
    const downloadUrl = `https://raw.githubusercontent.com/${slug}/${tag}/dist/firmware.uf2`
    const req = await fetch(downloadUrl, { headers: { "Accept": "application/octet-stream" } })
    if (req.status == 200) {
        const firmware = await req.blob()
        return firmware;
    }
    return undefined;
}