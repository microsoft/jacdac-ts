export function sevenSegmentDigitEncode(value: number, digitCount: number) {
    const ns = isNaN(value) ? "" : value.toString()
    const length = digitCount
    if (isNaN(length)) return // unknown size

    const digits = new Uint8Array(length)
    const n = Math.min(length, ns.length)
    /*
     * ```text
     *  - A -
     *  F   B
     *  |   |
     *  - G -
     *  |   |   -
     *  E   C  |DP|
     *  - D -   -
     * ```
     */
    const digitBits = [
        0b00111111, // 0
        0b00000110, // 1
        0b01011011, // 2
        0b01001111, // 3
        0b01100110, // 4
        0b01101101, // 5
        0b01111101, // 6
        0b00000111, // 7
        0b01111111, // 8
        0b01101111, // 9
    ]

    let k = digits.length - 1
    for (let i = n - 1; i >= 0; --i) {
        let c = ns.charCodeAt(i)
        let value = 0
        // dot
        if (c == 46) {
            i--
            if (i > -1) c = ns.charCodeAt(i)
            value |= 0b10000000
        }
        // 0-9
        if (c >= 48 && c < 48 + digitBits.length) value |= digitBits[c - 48]
        // -
        else if (c == 45) value |= 0b01000000
        // e, E
        else if (c == 69 || c == 101) value |= 0b01001111
        digits[k--] = value
    }

    return digits
}
