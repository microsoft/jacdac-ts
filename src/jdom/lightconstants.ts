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

export const LIGHT_PROG_SET_ALL = 0xd0
export const LIGHT_PROG_FADE = 0xd1
export const LIGHT_PROG_FADE_HSV = 0xd2
export const LIGHT_PROG_ROTATE_FWD = 0xd3
export const LIGHT_PROG_ROTATE_BACK = 0xd4
export const LIGHT_PROG_SHOW = 0xd5
export const LIGHT_PROG_RANGE = 0xd6
export const LIGHT_PROG_MODE = 0xd7
export const LIGHT_PROG_MODE1 = 0xd8

export const LIGHT_MODE_REPLACE = 0x00
export const LIGHT_MODE_ADD_RGB = 0x01
export const LIGHT_MODE_SUBTRACT_RGB = 0x02
export const LIGHT_MODE_MULTIPLY_RGB = 0x03
export const LIGHT_MODE_LAST = 0x03

export const LIGHT_PROG_COLN = 0xc0
export const LIGHT_PROG_COL1 = 0xc1
export const LIGHT_PROG_COL2 = 0xc2
export const LIGHT_PROG_COL3 = 0xc3

export const LIGHT_PROG_COL1_SET = 0xcf
