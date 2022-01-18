export interface Setting {
    get(): string | undefined
    set(v: string): void
}

let settingsPath = ""

export function keyedSetting(key: string): Setting {
    if (typeof window != "undefined" && window.localStorage) {
        return {
            get: () => window.localStorage.getItem(key) ?? undefined,
            set: v => window.localStorage.setItem(key, v),
        }
    } else {
        let v: string
        let keyPath: string
        const fs = require("fs")
        function init() {
            if (!settingsPath) {
                const jd = process.env["HOME"] + "/.jacdac"
                try {
                    fs.mkdirSync(jd)
                } catch {}
                settingsPath = jd + "/settings"
                try {
                    fs.mkdirSync(settingsPath)
                } catch {}
            }
            if (!keyPath) {
                keyPath =
                    settingsPath +
                    "/" +
                    key.replace(/[^a-z_\-]/g, c => c.charCodeAt(0) + "")
                try {
                    v = fs.readFileSync(keyPath, "utf8")
                } catch {
                    v = undefined
                }
            }
        }
        function get() {
            init()
            return v
        }
        function set(nv: string) {
            init()
            if (v !== nv) {
                v = nv
                fs.writeFileSync(keyPath, nv, "utf8")
            }
        }
        return { get, set }
    }
}
