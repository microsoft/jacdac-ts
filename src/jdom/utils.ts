export function throwError(msg: string, cancel?: boolean) {
    const e = new Error(msg)
    if (cancel)
        (e as any).__cancel = true;
    throw e;
}

export function isCancelError(e: Error) {
    return !!(e as any)?.__cancel;
}

export function setAckError(e: Error) {
    if (e)
        (e as any).__ack = true;
}

export function isAckError(e: Error) {
    return !!(e as any)?.__ack;
}

export function log(msg: string, v?: any) {
    if (v === undefined)
        console.log("JD: " + msg)
    else
        console.log("JD: " + msg, v)
}

export function warn(msg: string, v?: any) {
    if (v === undefined)
        console.log("JD-WARN: " + msg)
    else
        console.log("JD-WARN: " + msg, v)
}

export function delay<T>(millis: number, value?: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), millis))
}

export function memcpy(trg: Uint8Array, trgOff: number, src: ArrayLike<number>, srcOff?: number, len?: number) {
    if (srcOff === void 0)
        srcOff = 0
    if (len === void 0)
        len = src.length - srcOff
    for (let i = 0; i < len; ++i)
        trg[trgOff + i] = src[srcOff + i]
}

export function strcmp(a: string, b: string) {
    if (a == b) return 0;
    if (a < b) return -1;
    else return 1;
}

export function bufferEq(a: Uint8Array, b: ArrayLike<number>, offset = 0) {
    if (a == b)
        return true
    if (!a || !b || a.length != b.length)
        return false
    for (let i = offset; i < a.length; ++i) {
        if (a[i] != b[i]) return false
    }
    return true
}

export function hash(buf: Uint8Array, bits: number) {
    bits |= 0
    if (bits < 1)
        return 0
    const h = fnv1(buf)
    if (bits >= 32)
        return h >>> 0
    else
        return ((h ^ (h >>> bits)) & ((1 << bits) - 1)) >>> 0
}

export function idiv(a: number, b: number) { return ((a | 0) / (b | 0)) | 0 }
export function fnv1(data: Uint8Array) {
    let h = 0x811c9dc5
    for (let i = 0; i < data.length; ++i) {
        h = Math.imul(h, 0x1000193) ^ data[i]
    }
    return h
}

export function crc(p: Uint8Array) {
    let crc = 0xffff;
    for (let i = 0; i < p.length; ++i) {
        const data = p[i];
        let x = (crc >> 8) ^ data;
        x ^= x >> 4;
        crc = (crc << 8) ^ (x << 12) ^ (x << 5) ^ x;
        crc &= 0xffff;
    }
    return crc;
}

export function ALIGN(n: number) { return (n + 3) & ~3 }

// this will take lower 8 bits from each character
export function stringToUint8Array(input: string) {
    let len = input.length;
    let res = new Uint8Array(len)
    for (let i = 0; i < len; ++i)
        res[i] = input.charCodeAt(i) & 0xff;
    return res;
}

export function uint8ArrayToString(input: ArrayLike<number>) {
    let len = input.length;
    let res = ""
    for (let i = 0; i < len; ++i)
        res += String.fromCharCode(input[i]);
    return res;
}


export function fromUTF8(binstr: string) {
    if (!binstr) return ""

    // escape function is deprecated
    let escaped = ""
    for (let i = 0; i < binstr.length; ++i) {
        let k = binstr.charCodeAt(i) & 0xff
        if (k == 37 || k > 0x7f) {
            escaped += "%" + k.toString(16);
        } else {
            escaped += binstr.charAt(i)
        }
    }

    // decodeURIComponent does the actual UTF8 decoding
    return decodeURIComponent(escaped)
}

export function toUTF8(str: string, cesu8?: boolean) {
    let res = "";
    if (!str) return res;
    for (let i = 0; i < str.length; ++i) {
        let code = str.charCodeAt(i);
        if (code <= 0x7f) res += str.charAt(i);
        else if (code <= 0x7ff) {
            res += String.fromCharCode(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else {
            if (!cesu8 && 0xd800 <= code && code <= 0xdbff) {
                let next = str.charCodeAt(++i);
                if (!isNaN(next))
                    code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
            }

            if (code <= 0xffff)
                res += String.fromCharCode(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            else
                res += String.fromCharCode(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }

    }
    return res;
}


export interface SMap<T> {
    [index: string]: T;
}

export class PromiseBuffer<T> {
    private waiting: ((v: (T | Error)) => void)[] = [];
    private available: (T | Error)[] = [];

    drain() {
        for (let f of this.waiting) {
            f(new Error("Promise Buffer Reset"))
        }
        this.waiting = []
        this.available = []
    }


    pushError(v: Error) {
        this.push(v as any)
    }

    push(v: T) {
        let f = this.waiting.shift()
        if (f) f(v)
        else this.available.push(v)
    }

    shiftAsync(timeout = 0) {
        if (this.available.length > 0) {
            let v = this.available.shift()
            if (v instanceof Error)
                return Promise.reject<T>(v)
            else
                return Promise.resolve<T>(v)
        } else
            return new Promise<T>((resolve, reject) => {
                let f = (v: (T | Error)) => {
                    if (v instanceof Error) reject(v)
                    else resolve(v)
                }
                this.waiting.push(f)
                if (timeout > 0) {
                    delay(timeout)
                        .then(() => {
                            let idx = this.waiting.indexOf(f)
                            if (idx >= 0) {
                                this.waiting.splice(idx, 1)
                                reject(new Error("Timeout"))
                            }
                        })
                }
            })
    }
}


export class PromiseQueue {
    promises: SMap<(() => Promise<any>)[]> = {};

    enqueue<T>(id: string, f: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            let arr = this.promises[id]
            if (!arr) {
                arr = this.promises[id] = []
            }
            const cleanup = () => {
                arr.shift()
                if (arr.length == 0)
                    delete this.promises[id]
                else
                    arr[0]()
            }
            arr.push(() =>
                f().then(v => {
                    cleanup()
                    resolve(v)
                }, err => {
                    cleanup()
                    reject(err)
                }))
            if (arr.length == 1)
                arr[0]()
        })
    }
}

export function toHex(bytes: ArrayLike<number>) {
    if (!bytes) return undefined;
    let r = ""
    for (let i = 0; i < bytes.length; ++i)
        r += ("0" + bytes[i].toString(16)).slice(-2)
    return r
}

export function fromHex(hex: string) {
    const r = new Uint8Array(hex.length >> 1)
    for (let i = 0; i < hex.length; i += 2)
        r[i >> 1] = parseInt(hex.slice(i, i + 2), 16)
    return r
}

export function isSet(v: any) {
    return v !== null && v !== undefined
}

export function toArray<T>(a: ArrayLike<T>): T[] {
    const r: T[] = new Array(a.length)
    for (let i = 0; i < a.length; ++i)
        r[i] = a[i]
    return r
}

export interface MutableArrayLike<T> {
    readonly length: number;
    [n: number]: T;
}

export function hexNum(n: number): string {
    if (n < 0)
        return "-" + hexNum(-n)
    return "0x" + n.toString(16)
}

export function write32(buf: MutableArrayLike<number>, pos: number, v: number) {
    buf[pos + 0] = (v >> 0) & 0xff;
    buf[pos + 1] = (v >> 8) & 0xff;
    buf[pos + 2] = (v >> 16) & 0xff;
    buf[pos + 3] = (v >> 24) & 0xff;
}

export function write16(buf: MutableArrayLike<number>, pos: number, v: number) {
    buf[pos + 0] = (v >> 0) & 0xff;
    buf[pos + 1] = (v >> 8) & 0xff;
}

export function read32(buf: ArrayLike<number>, pos: number) {
    return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) >>> 0
}

export function read16(buf: ArrayLike<number>, pos: number) {
    return buf[pos] | (buf[pos + 1] << 8)
}

export function encodeU32LE(words: number[]) {
    let r = new Uint8Array(words.length * 4)
    for (let i = 0; i < words.length; ++i)
        write32(r, i * 4, words[i])
    return r
}

export function decodeU32LE(buf: Uint8Array) {
    let res: number[] = []
    for (let i = 0; i < buf.length; i += 4)
        res.push(read32(buf, i))
    return res
}

export function isBufferEmpty(data: Uint8Array): boolean {
    if (!data) return true;
    const n = data.length;
    for (let i = 0; i < data.length; ++i) {
        if (data[i])
            return false;
    }
    return true;
}


export function bufferToString(buf: Uint8Array) {
    return fromUTF8(uint8ArrayToString(buf))
}

export function stringToBuffer(str: string) {
    return stringToUint8Array(toUTF8(str))
}

export function bufferConcat(a: Uint8Array, b: Uint8Array) {
    const r = new Uint8Array(a.length + b.length)
    r.set(a, 0)
    r.set(b, a.length)
    return r
}

export function bufferConcatMany(bufs: Uint8Array[]) {
    let sz = 0
    for (const buf of bufs)
        sz += buf.length
    const r = new Uint8Array(sz)
    sz = 0
    for (const buf of bufs) {
        r.set(buf, sz)
        sz += buf.length
    }
    return r
}

export function arrayConcatMany<T>(arrs: T[][]) {
    let sz = 0
    for (const buf of arrs)
        sz += buf.length
    const r: T[] = new Array(sz)
    sz = 0
    for (const arr of arrs) {
        for (let i = 0; i < arr.length; ++i)
            r[i + sz] = arr[i]
        sz += arr.length
    }
    return r
}

export function jsonCopyFrom<T>(trg: T, src: T) {
    let v = clone(src)
    for (let k of Object.keys(src)) {
        (trg as any)[k] = (v as any)[k]
    }
}
export function assert(cond: boolean, msg = "Assertion failed") {
    if (!cond) {
        debugger
        throw new Error(msg)
    }
}

export function flatClone<T extends Object>(obj: T): T {
    if (obj == null) return null
    let r: any = {}
    Object.keys(obj).forEach((k) => { r[k] = (obj as any)[k] })
    return r;
}

export function clone<T>(v: T): T {
    if (v == null) return null
    return JSON.parse(JSON.stringify(v))
}

export function throttle(handler: () => void, delay: number): () => void {
    let enableCall = true;
    return function () {
        if (!enableCall) return;
        enableCall = false;
        handler();
        setTimeout(() => enableCall = true, delay);
    }
}

export interface Signal {
    signalled: Promise<void>
    signal: () => void
}
export function signal(): Signal {
    let resolve: () => void
    return {
        signalled: new Promise(r => { resolve = r }),
        signal: () => resolve()
    }
}

export function readBlobToUint8Array(blob: Blob): Promise<Uint8Array> {
    if (!!blob.arrayBuffer) {
        return blob.arrayBuffer()
            .then(data => new Uint8Array(data));
    }

    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
            resolve(new Uint8Array(fileReader.result as ArrayBuffer))
        }
        fileReader.onerror = (e) => {
            console.log(e)
            reject(e)
        }
        try {
            fileReader.readAsArrayBuffer(blob);
        } catch (e) {
            reject(e);
        }
    })
}

export function readBlobToText(blob: Blob): Promise<string> {
    if (!!blob.text) {
        return blob.text()
    }

    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result as string)
        fileReader.onerror = (e) => {
            console.log(e)
            reject(e)
        }
        try {
            fileReader.readAsText(blob);
        } catch (e) {
            reject(e);
        }
    })
}

export function debounce(handler: () => void, delay: number): () => void {
    let timeOutId: any;
    return function () {
        if (timeOutId) {
            clearTimeout(timeOutId);
        }
        timeOutId = setTimeout(async () => {
            handler();
        }, delay);
    }
}

export function debounceAsync(handler: () => Promise<void>, delay: number): () => void {
    let timeOutId: any;
    return function () {
        if (timeOutId) {
            clearTimeout(timeOutId);
        }
        timeOutId = setTimeout(async () => {
            await handler();
        }, delay);
    }
}

export function cryptoRandomUint32(length: number): Uint32Array {
    if (typeof window === "undefined")
        return undefined; // not supported
    const vals = new Uint32Array(length)
    window.crypto.getRandomValues(vals)
    return vals;
}

export function anyRandomUint32(length: number): Uint32Array {
    let r = cryptoRandomUint32(length);
    if (!r) {
        r = new Uint32Array(length)
        for (let i = 0; i < r.length; ++i)
            r[i] = Math.random() * 0x1_0000_0000 >>> 0
    }
    return r;
}

export function randomUInt(max: number) {
    const arr = anyRandomUint32(1)
    return arr[0] % max
}

export function JSONTryParse(src: string) {
    if (src === undefined || src === null)
        return src;

    try {
        return JSON.parse(src)
    }
    catch (e) {
        return undefined;
    }
}

export function roundWithPrecision(x: number, digits: number): number {
    digits = digits | 0;
    // invalid digits input
    if (digits <= 0) return Math.round(x);
    if (x == 0) return 0;
    let r = 0;
    while (r == 0 && digits < 21) {
        const d = Math.pow(10, digits++);
        r = Math.round(x * d + Number.EPSILON) / d;
    }
    return r;
}

export function unique(values: string[]): string[] {
    return Array.from(new Set(values).keys());
}

export function uniqueMap<T, U>(values: T[], id: (value: T) => string, converted: (value: T) => U) {
    const r: SMap<T> = {}
    for (let i = 0; i < values.length; ++i) {
        const value = values[i]
        const idv = id(value)
        if (!r[idv]) {
            r[idv] = value;
        }
    }
    return Object.values(r).map(converted)
}

export function ellipseJoin(values: string[], maxChars: number, ellipse = "...") {
    let r = "";
    for (let i = 0; i < values.length && r.length < maxChars; ++i) {
        if (r)
            r += ", ";
        r += values[i];
    }
    if (r.length > maxChars)
        return r.slice(0, maxChars) + ellipse;
    else
        return r;
}

export function arrayShuffle<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function uniqueName(names: string[], name: string): string {
    if (names.indexOf(name) < 0)
        return name;
    // allocate names
    let count = 2;
    while (names.indexOf(`${name}${count}`) > -1)
        count++;
    return `${name}${count}`;
}

export function groupBy<T>(list: T[], key: (value: T) => string): SMap<T[]> {
    if (!list) return {};

    const r: SMap<T[]> = {}
    list.forEach((item) => {
        const k = key(item);
        const a = r[k] || (r[k] = []);
        a.push(item);
    });
    return r;
}

export function pick(...values: number[]) {
    return values?.find(x => x !== undefined);
}

/**
 * Applies filters and returns array of [yays, nays]
 * @param values 
 * @param condition 
 */
export function splitFilter<T>(values: ArrayLike<T>, condition: (t: T) => boolean): [T[], T[]] {
    let yays: T[] = [];
    let nays: T[] = [];
    const n = values.length
    for (let i = 0; i < n; ++i) {
        const v = values[i];
        if (condition(v))
            yays.push(v)
        else
            nays.push(v);
    }
    return [yays, nays];
}

export function range(end: number): number[] {
    return Array(end).fill(0).map((_, i) => i);
}