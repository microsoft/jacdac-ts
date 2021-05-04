import { toHex } from "./utils"

export function cryptoRandomUint32(length: number): Uint32Array {
    if (typeof window === "undefined") return undefined // not supported
    const vals = new Uint32Array(length)
    window.crypto.getRandomValues(vals)
    return vals
}

export function anyRandomUint32(length: number): Uint32Array {
    let r = cryptoRandomUint32(length)
    if (!r) {
        r = new Uint32Array(length)
        for (let i = 0; i < r.length; ++i)
            r[i] = (Math.random() * 0x1_0000_0000) >>> 0
    }
    return r
}

export function randomUInt(max: number) {
    const arr = anyRandomUint32(1)
    return arr[0] % max
}

export function randomDeviceId() {
    const devId = anyRandomUint32(8)
    for (let i = 0; i < 8; ++i) devId[i] &= 0xff
    return toHex(devId)
}