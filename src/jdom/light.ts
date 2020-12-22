import { getNumber, NumberFormat } from "./buffer"
import { fromHex } from "./utils"

function cmdCode(cmd: string) {
    switch (cmd) {
        case "setall": return 0xD0
        case "fade": return 0xD1
        case "fadehsv": return 0xD2
        case "rotfwd": return 0xD3
        case "rotback": return 0xD4
        case "show":
        case "wait": return 0xD5
        case "range": return 0xD6
        case "mode": return 0xD7
        case "tmpmode": return 0xD8
        case "setone": return 0xCF
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
            throw "light: number out of range: " + n
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
                throw "setone requires 1 color"
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
                throw "Unknown light command: " + token
            if (currcmd == 0x100) {
                const f = parseFloat(nextToken())
                if (isNaN(f) || f < 0 || f > 2)
                    throw "expecting scale"
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
            if (args.length == 0) throw "Out of args, %"
            const v = args.shift()
            if (typeof v != "number")
                throw "Expecting number"
            pushNumber(v)
        } else if (t0 == 35) { // #
            if (token.length == 1) {
                if (args.length == 0) throw "Out of args, #"
                const v = args.shift()
                if (typeof v == "number")
                    colors.push(v)
                else
                    for (let vv of v) colors.push(vv)
            } else {
                if (token.length == 7) {
                    const b = fromHex("00" + token.slice(1))
                    colors.push(getNumber(b, NumberFormat.UInt32BE, 0))
                } else {
                    throw "Invalid color: " + token
                }
            }
        }
    }
    flush()

    return new Uint8Array(outarr)
}