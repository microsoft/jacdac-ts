export function hsvToCss(
    hue: number,
    saturation: number,
    value: number,
    brightness: number,
    monochrome?: boolean
) {
    const csshue = (hue * 360) / 0xff
    const csssat = (monochrome ? 0xff : saturation) / 0xff
    const cssval = value / 0xff
    const [h, s, l] = hsv_to_hsl(csshue, csssat, cssval)
    const mixl = 0.3
    const alpha = (mixl + (1 - mixl) * l) * brightness

    return `hsla(${h}, ${s * 100}%, ${l * 100}%, ${alpha}`
}

function hsv_to_hsl(h: number, s: number, v: number) {
    // both hsv and hsl values are in [0, 1]
    const l = ((2 - s) * v) / 2

    if (l != 0) {
        if (l == 1) {
            s = 0
        } else if (l < 0.5) {
            s = (s * v) / (l * 2)
        } else {
            s = (s * v) / (2 - l * 2)
        }
    }

    return [h, s, l]
}
