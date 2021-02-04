import { fromHex } from "./utils"

/*
* `0xD0: set_all(C+)` - set all pixels in current range to given color pattern
* `0xD1: fade(C+)` - set `N` pixels to color between colors in sequence
* `0xD2: fade_hsv(C+)` - similar to `fade()`, but colors are specified and faded in HSV
* `0xD3: rotate_fwd(K)` - rotate (shift) pixels by `K` positions away from the connector
* `0xD4: rotate_back(K)` - same, but towards the connector
* `0xD5: show(M=50)` - send buffer to strip and wait `M` milliseconds
* `0xD6: range(P=0, N=length)` - range from pixel `P`, `N` pixels long
* `0xD7: mode(K=0)` - set update mode
* `0xD8: mode1(K=0)` - set update mode for next command only
*/

export const LIGHT_PROG_SET_ALL = 0xD0
export const LIGHT_PROG_FADE = 0xD1
export const LIGHT_PROG_FADE_HSV = 0xD2
export const LIGHT_PROG_ROTATE_FWD = 0xD3
export const LIGHT_PROG_ROTATE_BACK = 0xD4
export const LIGHT_PROG_SHOW = 0xD5
export const LIGHT_PROG_RANGE = 0xD6
export const LIGHT_PROG_MODE = 0xD7
export const LIGHT_PROG_MODE1 = 0xD8

export const LIGHT_MODE_REPLACE = 0x00
export const LIGHT_MODE_ADD_RGB = 0x01
export const LIGHT_MODE_SUBTRACT_RGB = 0x02
export const LIGHT_MODE_MULTIPLY_RGB = 0x03
export const LIGHT_MODE_LAST = 0x03

export const LIGHT_PROG_COLN = 0xC0
export const LIGHT_PROG_COL1 = 0xC1
export const LIGHT_PROG_COL2 = 0xC2
export const LIGHT_PROG_COL3 = 0xC3

export const LIGHT_PROG_COL1_SET = 0xCF

function cmdCode(cmd: string) {
    switch (cmd) {
        case "setall": return LIGHT_PROG_SET_ALL
        case "fade": return LIGHT_PROG_FADE
        case "fadehsv": return LIGHT_PROG_FADE_HSV
        case "rotfwd": return LIGHT_PROG_ROTATE_FWD
        case "rotback": return LIGHT_PROG_ROTATE_BACK
        case "show":
        case "wait": return LIGHT_PROG_SHOW
        case "range": return LIGHT_PROG_RANGE
        case "mode": return LIGHT_PROG_MODE
        case "tmpmode": return LIGHT_PROG_MODE1
        case "setone": return LIGHT_PROG_COL1_SET
        case "mult": return 0x100
        default: return undefined
    }
}

function isWhiteSpace(code: number) {
    return code == 32 || code == 13 || code == 10 || code == 9
}

export function lightEncode(format: string, args: (number | number[])[]) {
    // tokens are white-space separated
    // % - number from args[]
    // # - color from args[]
    // #0123ff - color
    // 123 - number
    // commands: set, fade, fadehsv, rotfwd, rotback, pause
    // fadehsv 0 12 #00ffff #ffffff

    const outarr: number[] = []
    let colors: number[] = []
    let pos = 0
    let currcmd = 0

    function pushNumber(n: number) {
        if (n == null || (n | 0) != n || n < 0 || n >= 16383)
            throw new Error("number out of range: " + n)
        if (n < 128)
            outarr.push(n)
        else {
            outarr.push(0x80 | (n >> 8))
            outarr.push(n & 0xff)
        }
    }

    function flush() {
        if (currcmd == 0xCF) {
            if (colors.length != 1)
                throw new Error("setone requires 1 color")
        } else {
            if (colors.length == 0)
                return
            if (colors.length <= 3)
                outarr.push(0xC0 | colors.length)
            else {
                outarr.push(0xC0)
                outarr.push(colors.length)
            }
        }
        for (let c of colors) {
            outarr.push((c >> 16) & 0xff)
            outarr.push((c >> 8) & 0xff)
            outarr.push((c >> 0) & 0xff)
        }
        colors = []
    }

    function nextToken() {
        while (isWhiteSpace(format.charCodeAt(pos)))
            pos++;
        const beg = pos
        while (pos < format.length && !isWhiteSpace(format.charCodeAt(pos)))
            pos++
        return format.slice(beg, pos)

    }

    while (pos < format.length) {
        const token = nextToken()
        const t0 = token.charCodeAt(0)
        if (97 <= t0 && t0 <= 122) { // a-z
            flush()
            currcmd = cmdCode(token)
            if (currcmd == undefined)
                throw new Error("unknown light command: " + token)
            if (currcmd == 0x100) {
                const f = parseFloat(nextToken())
                if (isNaN(f) || f < 0 || f > 2)
                    throw new Error("expecting scale")
                outarr.push(0xD8) // tmpmode
                outarr.push(3) // mult
                outarr.push(0xD0) // setall
                const mm = Math.round(128 * f) & 0xff;
                outarr.push(0xC1)
                outarr.push(mm)
                outarr.push(mm)
                outarr.push(mm)
            } else {
                outarr.push(currcmd)
            }
        } else if (48 <= t0 && t0 <= 57) { // 0-9
            pushNumber(parseInt(token))
        } else if (t0 == 37) { // %
            if (args.length == 0) throw new Error("out of args, %")
            const v = args.shift()
            if (typeof v != "number")
                throw new Error("expecting number")
            pushNumber(v)
        } else if (t0 == 35) { // #
            if (token.length == 1) {
                if (args.length == 0) throw new Error("out of args, #")
                const v = args.shift()
                if (typeof v == "number")
                    colors.push(v)
                else
                    for (let vv of v) colors.push(vv)
            } else {
                if (token.length == 7) {
                    const b = fromHex(token.slice(1))
                    const c = (b[0] << 16) | (b[1] << 8) | b[2];
                    colors.push(c)
                } else {
                    throw new Error("invalid color: " + token)
                }
            }
        }
    }
    flush()

    return new Uint8Array(outarr)
}
