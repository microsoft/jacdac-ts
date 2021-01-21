import { timeStamp } from "console";
import {
    CHANGE, LedPixelCmd,
    LedPixelLightType,
    LedPixelReg,
    LedPixelVariant, RENDER, SRV_LED_PIXEL
} from "../jdom/constants";
import {
    LIGHT_MODE_ADD_RGB, LIGHT_MODE_LAST, LIGHT_MODE_MULTIPLY_RGB, LIGHT_MODE_REPLACE, LIGHT_MODE_SUBTRACT_RGB,
    LIGHT_PROG_COL1, LIGHT_PROG_COL1_SET, LIGHT_PROG_COL2, LIGHT_PROG_COL3, LIGHT_PROG_COLN, LIGHT_PROG_FADE,
    LIGHT_PROG_FADE_HSV, LIGHT_PROG_MODE, LIGHT_PROG_MODE1, LIGHT_PROG_RANGE, LIGHT_PROG_ROTATE_BACK, LIGHT_PROG_ROTATE_FWD,
    LIGHT_PROG_SET_ALL, LIGHT_PROG_SHOW
} from "../jdom/light";
import Packet from "../jdom/packet";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost, { JDServiceHostOptions } from "../jdom/servicehost";
import { toHex } from "../jdom/utils";

const PROG_EOF = 0
const PROG_CMD = 1
const PROG_NUMBER = 3
const PROG_COLOR_BLOCK = 4

interface RGB {
    r: number;
    g: number;
    b: number;
}

function rgb(r: number, g: number, b: number) {
    return { r, g, b }
}

function hsv(hue: number, sat: number, val: number): RGB {
    // scale down to 0..192
    hue = (hue * 192) >> 8;

    // reference: based on FastLED's hsv2rgb rainbow algorithm
    // [https://github.com/FastLED/FastLED](MIT)
    const invsat = 255 - sat;
    const brightness_floor = (val * invsat) >> 8;
    const color_amplitude = val - brightness_floor;
    const section = (hue / 0x40) >> 0; // [0..2]
    const offset = (hue % 0x40) >> 0;  // [0..63]

    const rampup = offset;
    const rampdown = (0x40 - 1) - offset;

    const rampup_amp_adj = ((rampup * color_amplitude) / (256 / 4)) >> 0;
    const rampdown_amp_adj = ((rampdown * color_amplitude) / (256 / 4)) >> 0;

    const rampup_adj_with_floor = (rampup_amp_adj + brightness_floor);
    const rampdown_adj_with_floor = (rampdown_amp_adj + brightness_floor);

    let r: number = 0, g: number = 0, b: number = 0;
    if (section) {
        if (section == 1) {
            // section 1: 0x40..0x7F
            r = brightness_floor;
            g = rampdown_adj_with_floor;
            b = rampup_adj_with_floor;
        } else {
            // section 2; 0x80..0xBF
            r = rampup_adj_with_floor;
            g = brightness_floor;
            b = rampdown_adj_with_floor;
        }
    } else {
        // section 0: 0x00..0x3F
        r = rampdown_adj_with_floor;
        g = rampup_adj_with_floor;
        b = brightness_floor;
    }
    return rgb(r, g, b);
}

function is_empty(data: Uint8Array): boolean {
    const n = data.length;
    for (let i = 0; i < data.length; ++i) {
        if (data[i])
            return false;
    }
    return true;
}

function mulcol(c: number, m: number): number {
    let c2 = (c * m) >> 7;
    if (m < 128 && c == c2)
        c2--;
    else if (m > 128 && c == c2)
        c2++;
    return c2;
}

function clamp(c: number): number {
    if (c < 0)
        return 0;
    if (c > 255)
        return 255;
    return c;
}

function SCALE0(c: number, i: number) {
    return ((((c) & 0xff) * (1 + (i & 0xff))) >> 8)
}

function now(): number {
    return (performance.now() * 1000) >> 0;
}
function in_past(t: number) {
    return t < now();
}

export default class LightServiceHost extends JDServiceHost {
    readonly brightness: JDRegisterHost<[number]>;
    readonly actualBrightness: JDRegisterHost<[number]>;
    readonly lightType: JDRegisterHost<[LedPixelLightType]>;
    readonly numPixels: JDRegisterHost<[number]>;
    readonly maxPower: JDRegisterHost<[number]>;
    readonly variant: JDRegisterHost<[LedPixelVariant]>;
    readonly maxPixels: JDRegisterHost<[number]>;
    readonly numRepeats: JDRegisterHost<[number]>;

    private pxbuffer: Uint8Array = new Uint8Array(0);

    private prog_mode: number = 0;
    private prog_tmpmode: number = 0;

    private range_start: number = 0;
    private range_end: number = 0;
    private range_len: number = 0;
    private range_ptr: number = 0;

    private prog_ptr: number = 0;
    private prog_size: number = 0;
    private prog_data = new Uint8Array(0);

    private dirty: boolean = true;
    private inited: boolean = false;

    power_enable = false;

    constructor(options?: {
        numPixels?: number,
        maxPixels?: number,
        maxPower?: number
    } & JDServiceHostOptions) {
        super(SRV_LED_PIXEL, options);

        this.brightness = this.addRegister<[number]>(LedPixelReg.Brightness, [15]);
        this.actualBrightness = this.addRegister<[number]>(LedPixelReg.ActualBrightness, [15]);
        this.lightType = this.addRegister<[LedPixelLightType]>(LedPixelReg.LightType, [LedPixelLightType.WS2812B_GRB]);
        this.numPixels = this.addRegister<[number]>(LedPixelReg.NumPixels, [options?.numPixels || 15]);
        this.maxPower = this.addRegister<[number]>(LedPixelReg.MaxPower, [options?.maxPower || 200]);
        this.maxPixels = this.addRegister<[number]>(LedPixelReg.MaxPixels, [options?.maxPixels || 300]);
        this.variant = this.addRegister<[LedPixelVariant]>(LedPixelReg.Variant, [LedPixelVariant.Strip]);
        this.numRepeats = this.addRegister<[number]>(LedPixelReg.NumRepeats, [0]);

        this.brightness.on(CHANGE, () => this.intensity = this.requested_intensity);
        this.numPixels.on(CHANGE, this.allocRxBuffer.bind(this))
        this.maxPixels.on(CHANGE, this.allocRxBuffer.bind(this));

        this.addCommand(LedPixelCmd.Run, this.handleRun.bind(this));

        this.allocRxBuffer();
    }

    /**
     * Gets an array of RGB color numbers
     */
    get colors() {
        return this.pxbuffer;
    }

    private get maxpower(): number {
        const [r] = this.maxPower.values();
        return r;
    }

    private get maxpixels(): number {
        const [r] = this.maxPixels.values();
        return r;
    }

    private get numpixels(): number {
        const [r] = this.numPixels.values();
        return r;
    }

    private get requested_intensity(): number {
        const [r] = this.brightness.values();
        return r;
    }

    private get intensity(): number {
        const [r] = this.actualBrightness.values();
        return r;
    }

    private set intensity(v: number) {
        this.actualBrightness.setValues([v]);
    }

    private jd_power_enable(value: boolean) {
        this.power_enable = value;
    }

    is_enabled() {
        return this.numpixels > 0 && this.requested_intensity > 0;
    }

    private allocRxBuffer() {
        if (this.numpixels > this.maxpixels)
            this.numPixels.setValues([this.maxpixels]);
        const n = this.numpixels * 3; // don't need to prealloc here
        if (n !== this.pxbuffer.length)
            this.pxbuffer = new Uint8Array(n);
    }

    private reset_range() {
        this.range_ptr = this.range_start;
    }

    private set_next(c: RGB) {
        if (this.range_ptr >= this.range_end)
            return false;

        const p = this.pxbuffer;
        let pi = this.range_ptr++ * 3;
        // fast path
        if (this.prog_tmpmode == LIGHT_MODE_REPLACE) {
            p[pi + 0] = c.r;
            p[pi + 1] = c.g;
            p[pi + 2] = c.b;
            return true;
        }

        let r = p[pi + 0], g = p[pi + 1], b = p[pi + 2];
        switch (this.prog_tmpmode) {
            case LIGHT_MODE_ADD_RGB:
                r += c.r;
                g += c.g;
                b += c.b;
                break;
            case LIGHT_MODE_SUBTRACT_RGB:
                r -= c.r;
                g -= c.g;
                b -= c.b;
                break;
            case LIGHT_MODE_MULTIPLY_RGB:
                r = mulcol(r, c.r);
                g = mulcol(g, c.g);
                b = mulcol(b, c.b);
                break;
        }
        p[pi + 0] = clamp(r);
        p[pi + 1] = clamp(g);
        p[pi + 2] = clamp(b);
        return true;
    }

    private limit_intensity() {
        const numpixels = this.numpixels;
        const requested_intensity = this.requested_intensity;
        const maxpower = this.maxpower;
        const pxbuffer = this.pxbuffer;

        let n = numpixels * 3;
        const prev_intensity = this.intensity;
        let intensity = this.intensity;

        intensity += 1 + (intensity >> 5);
        if (intensity > requested_intensity)
            intensity = requested_intensity;

        let current_full = 0;
        let current = 0;
        let current_prev = 0;
        let di = 0;
        while (n--) {
            let v = pxbuffer[di++];
            current += SCALE0(v, intensity);
            current_prev += SCALE0(v, prev_intensity);
            current_full += v;
        }

        // 46uA per step of LED
        current *= 46;
        current_prev *= 46;
        current_full *= 46;

        // 14mA is the chip at 48MHz, 930uA per LED is static
        let base_current = 14000 + 930 * numpixels;
        let current_limit = maxpower * 1000 - base_current;

        if (current <= current_limit) {
            this.intensity = intensity;
            // LOG("curr: %dmA; not limiting %d", (base_current + current) / 1000, state->intensity);
            return;
        }

        if (current_prev <= current_limit) {
            return; // no change needed
        }

        let inten = current_limit / (current_full >> 8) - 1;
        if (inten < 0)
            inten = 0;
        this.intensity = inten;
    }

    private prog_fetch_color(): RGB {
        const ptr = this.prog_ptr;
        if (ptr + 3 > this.prog_size)
            return rgb(0, 0, 0);
        const d = this.prog_data;
        this.prog_ptr = ptr + 3;
        return rgb(d[ptr + 0], d[ptr + 1], d[ptr + 2]);
    }

    private prog_fetch(): {
        dst?: number,
        prog: number
    } {
        if (this.prog_ptr >= this.prog_size)
            return { prog: PROG_EOF };
        const d = this.prog_data;
        const c = d[this.prog_ptr++];
        if (!(c & 0x80)) {
            return { dst: c, prog: PROG_NUMBER };
        } else if ((c & 0xc0) == 0x80) {
            return {
                dst: ((c & 0x3f) << 8) | d[this.prog_ptr++],
                prog: PROG_NUMBER
            }
        } else
            switch (c) {
                case LIGHT_PROG_COL1:
                    return {
                        dst: 1,
                        prog: PROG_COLOR_BLOCK
                    };
                case LIGHT_PROG_COL2:
                    return {
                        dst: 2,
                        prog: PROG_COLOR_BLOCK
                    }
                case LIGHT_PROG_COL3:
                    return {
                        dst: 3,
                        prog: PROG_COLOR_BLOCK
                    }
                case LIGHT_PROG_COLN:
                    return {
                        dst: d[this.prog_ptr++],
                        prog: PROG_COLOR_BLOCK
                    }
                default:
                    return {
                        dst: c,
                        prog: PROG_CMD
                    }
            }
    }

    private prog_fetch_num(defl: number): number {
        const prev = this.prog_ptr;
        const fr = this.prog_fetch();
        const { dst: res, prog: r } = fr;
        if (r == PROG_NUMBER)
            return res;
        else {
            this.prog_ptr = prev; // rollback
            return defl;
        }
    }

    private prog_fetch_cmd(): number {
        let cmd: number;
        // skip until there's a command
        for (; ;) {
            const c = this.prog_fetch();
            switch (c.prog) {
                case PROG_CMD:
                    return c.dst;
                case PROG_COLOR_BLOCK:
                    while (cmd--)
                        this.prog_fetch_color();
                    break;
                case PROG_EOF:
                    return 0;
            }
        }
    }

    private prog_set(len: number) {
        this.reset_range();
        const start = this.prog_ptr;
        for (; ;) {
            this.prog_ptr = start;
            let ok = false;
            for (let i = 0; i < len; ++i) {
                // don't break the loop immediately if !ok - make sure the prog counter advances
                ok = this.set_next(this.prog_fetch_color());
            }
            if (!ok)
                break;
        }
    }

    private prog_fade(len: number, usehsv: boolean) {
        if (len < 2) {
            this.prog_set(len);
            return;
        }
        let colidx = 0;
        const endp = this.prog_ptr + 3 * len;
        let col0 = this.prog_fetch_color();
        let col1 = this.prog_fetch_color();

        const colstep = ((len - 1) << 16) / this.range_len;
        let colpos = 0;

        this.reset_range();

        for (; ;) {
            while (colidx < (colpos >> 16)) {
                colidx++;
                col0 = col1;
                col1 = this.prog_fetch_color();
            }
            const fade1 = colpos & 0xffff;
            const fade0 = 0xffff - fade1;
            const col = rgb(
                (col0.r * fade0 + col1.r * fade1 + 0x8000) >> 16,
                (col0.g * fade0 + col1.g * fade1 + 0x8000) >> 16,
                (col0.b * fade0 + col1.b * fade1 + 0x8000) >> 16
            );
            if (!this.set_next(usehsv ? hsv(col.r, col.g, col.b) : col))
                break;
            colpos += colstep;
        }

        this.prog_ptr = endp;
    }

    private prog_rot(shift: number) {
        if (shift <= 0 || shift >= this.range_len)
            return;

        const range_start = this.range_start;
        const range_end = this.range_end;
        const buf = this.pxbuffer;

        let first = range_start * 3;
        let middle = (range_start + shift) * 3;
        let last = range_end * 3;
        let next = middle;

        while (first != next) {
            const tmp = buf[first];
            const tmp1 = buf[first + 1];
            const tmp2 = buf[first + 2];

            buf[first] = buf[next];
            buf[first + 1] = buf[next + 1];
            buf[first + 2] = buf[next + 2];

            buf[next] = tmp;
            buf[next + 1] = tmp1;
            buf[next + 2] = tmp2;

            first += 3;
            next += 3;

            if (next === last)
                next = middle;
            else if (first === middle)
                middle = next;
        }
    }

    private fetch_mode(): number {
        const m = this.prog_fetch_num(0);
        if (m > LIGHT_MODE_LAST)
            return 0;
        return m;
    }

    private prog_process() {
        const data = this.prog_data;

        if (this.prog_ptr >= this.prog_size)
            return false;

        // check that the program wasn't restarted
        // concurrently
        while (data === this.prog_data) {
            const cmd = this.prog_fetch_cmd();
            if (!cmd)
                break;

            if (cmd == LIGHT_PROG_SHOW) {
                const k = this.prog_fetch_num(50);
                this.dirty = true;
                setInterval(this.animationFrame.bind(this), k)
                // check data is still current;
                return data === this.prog_data;
            }

            switch (cmd) {
                case LIGHT_PROG_COL1_SET:
                    this.range_ptr = this.range_start + this.prog_fetch_num(0);
                    this.set_next(this.prog_fetch_color());
                    break;
                case LIGHT_PROG_FADE:
                case LIGHT_PROG_FADE_HSV:
                case LIGHT_PROG_SET_ALL: {
                    const { dst: len, prog: pcmd } = this.prog_fetch();
                    if (pcmd != PROG_COLOR_BLOCK || len == 0)
                        continue; // bailout
                    if (cmd == LIGHT_PROG_SET_ALL)
                        this.prog_set(len);
                    else
                        this.prog_fade(len, cmd == LIGHT_PROG_FADE_HSV);
                    break;
                }

                case LIGHT_PROG_ROTATE_BACK:
                case LIGHT_PROG_ROTATE_FWD: {
                    let k = this.prog_fetch_num(1);
                    const len = this.range_len;
                    if (len == 0)
                        continue;
                    while (k >= len)
                        k -= len;
                    if (cmd == LIGHT_PROG_ROTATE_FWD && k != 0)
                        k = len - k;
                    this.prog_rot(k);
                    break;
                }

                case LIGHT_PROG_MODE1:
                    this.prog_tmpmode = this.fetch_mode();
                    break;

                case LIGHT_PROG_MODE:
                    this.prog_mode = this.fetch_mode();
                    break;

                case LIGHT_PROG_RANGE: {
                    let start = this.prog_fetch_num(0);
                    const len = this.prog_fetch_num(this.numpixels);
                    const numpixels = this.numpixels;
                    if (start > numpixels)
                        start = numpixels;
                    let end = start + len;
                    if (end > numpixels)
                        end = numpixels;
                    this.range_start = start;
                    this.range_end = end;
                    this.range_len = end - start;
                    break;
                }
            }

            if (cmd != LIGHT_PROG_MODE1)
                this.prog_tmpmode = this.prog_mode;
        }

        return false;
    }

    /**
     * Perform an animation step
     */
    animationFrame() {
        if (!this.prog_process())
            return; // concurrently udpated

        if (!this.is_enabled()) return;
        if (this.dirty) {
            this.dirty = false;
            if (is_empty(this.pxbuffer)) {
                this.jd_power_enable(false);
                return;
            } else {
                this.jd_power_enable(true);
            }
            this.limit_intensity();
            // we're ready to render...
            this.emit(RENDER);
        }
    }

    private sync_config() {
        if (!this.is_enabled()) {
            this.jd_power_enable(false);
            return;
        }

        if (!this.inited) {
            this.inited = true;
            // initialize?
            // px_init(this.lighttype);
        }

        this.jd_power_enable(true);
    }

    private handleRun(pkt: Packet) {
        console.log("run", { data: toHex(pkt.data) })

        this.prog_data = pkt.data;
        this.prog_size = this.prog_data.length;
        this.prog_ptr = 0;

        this.range_start = 0;
        this.range_end = this.range_len = this.numpixels;
        this.prog_tmpmode = this.prog_mode = 0;

        this.sync_config();
        this.animationFrame();
    }
}