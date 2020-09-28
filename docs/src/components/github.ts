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

export async function fetchLatestRelease(slug: string): Promise<GithubRelease> {
    const uri = `${ROOT}repos/${slug}/releases/latest`;
    const resp = await fetch(uri)
//    console.log(resp)
    switch (resp.status) {
        case 200:
        case 204:
            const release: GithubRelease = await resp.json()
            return release;
        case 403:
            // throttled
            throw new Error("Too many calls to GitHub, try again later");
    }
    throw new Error(`unknown status code ${resp.status}`)
}