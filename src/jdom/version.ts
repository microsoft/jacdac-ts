/**
 * A packed version type, [patch, minor, major]
 */
export type Version = [number, number, number]

export function versionCompare(v0: Version, v1: Version) {
    return new Array(3)
        .fill(0)
        .map((_, i) =>
            v0 === undefined || v1 === undefined ? undefined : v0[i] - v1[i]
        )
}

/**
 * Converst a version register to a semver string
 */
export function versionToString(v: Version) {
    if (!v) return undefined
    return `v${v
        .slice(0)
        .reverse()
        .map(v => v.toString())
        .join(".")}`
}
