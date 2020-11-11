import useFetch from "./useFetch";

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

export interface GithubUser {
    login: string;
    avatar_url: string;
    html_url: string;
}

export interface GithubRepository {
    name: string;
    full_name: string;
    private: boolean;
    owner: GithubUser;
    description: string;
    fork: boolean;
    homepage: string;
    default_branch: string;
    organization: GithubUser;
    html_url: string;
}

export function normalizeSlug(slug: string): string {
    return slug.replace(/^https:\/\/github.com\//, "")
}

export interface GitHubApiOptions {
    ignoreThrottled?: boolean;
}

export async function fetchReleaseBinary(slug: string, tag: string): Promise<Blob> {
    const downloadUrl = `https://raw.githubusercontent.com/${normalizeSlug(slug)}/${tag}/dist/firmware.uf2`
    const req = await fetch(downloadUrl, { headers: { "Accept": "application/octet-stream" } })
    if (req.status == 200) {
        const firmware = await req.blob()
        return firmware;
    }
    return undefined;
}

function useFetchApi<T>(path: string, options?: GitHubApiOptions) {
    const res = useFetch<T>(`${ROOT}${path}`)
    switch (res.status) {
        case 200:
        case 201:
        case 202:
        case 203:
        case 204:
            break;
        case 404:
            // unknow repo or no access
            res.response = undefined;
            break;
        case 403:
            // throttled
            if (options?.ignoreThrottled)
                res.response = undefined;
            else
                throw new Error("Too many calls to GitHub, try again later");
        default:
            throw new Error("Unknown response from GitHub");
    }
    return res;
}

export function useRepository(slug: string) {
    const path = `repos/${normalizeSlug(slug)}`
    const res = useFetchApi<GithubRepository>(path);
    return res;
}

export function useLatestRelease(slug: string, options?: GitHubApiOptions) {
    const uri = `repos/${normalizeSlug(slug)}/releases/latest`;
    const res = useFetchApi<GithubRelease>(uri);
    return res;
}
