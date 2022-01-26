export interface Setting {
    get(): string | undefined
    set(v: string): void
}

export function localStorageSetting(key: string): Setting {
    if (typeof self !== "undefined" && self.localStorage) {
        return {
            get: () => self.localStorage.getItem(key) ?? undefined,
            set: v => self.localStorage.setItem(key, v),
        }
    }
    return undefined
}
