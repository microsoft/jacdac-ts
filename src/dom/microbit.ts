import { Proto, Transport } from "./hf2";
import {
    delay, PromiseQueue, write32, write16, read32, uint8ArrayToString, fromHex} from "./utils";

interface SendItem {
    buf: Uint8Array
    cb: () => void
}
export class CMSISProto implements Proto {
    private q = new PromiseQueue()
    private sendQ: SendItem[] = []
    private irqn: number
    private xchgAddr: number
    private _onJDMsg: (buf: Uint8Array) => void

    constructor(public io: Transport) {
    }

    private error(msg: string): never {
        // debugger
        throw new Error(msg)
    }

    onJDMessage(f: (buf: Uint8Array) => void): void {
        this._onJDMsg = f
    }

    sendJDMessageAsync(buf: Uint8Array): Promise<void> {
        if (buf.length & 3) {
            const tmp = new Uint8Array((buf.length + 3) & ~3)
            tmp.set(buf)
            buf = tmp
        }
        return new Promise<void>(resolve => {
            this.sendQ.push({
                buf,
                cb: resolve
            })
        })
    }

    disconnectAsync(): Promise<void> {
        return this.io.disconnectAsync()
    }

    private recvAsync() {
        return new Promise<Uint8Array>((resolve, reject) => {
            let to: any
            this.io.recvPacketAsync()
                .then(v => {
                    const f = resolve
                    resolve = null
                    if (f) {
                        clearTimeout(to)
                        f(v)
                    }
                }, err => {
                    if (resolve) {
                        resolve = null
                        clearTimeout(to)
                        reject(err)
                    }
                })
            to = setTimeout(() => {
                if (resolve) {
                    resolve = null
                    reject(new Error("CMSIS recv timeout"))
                }
            }, 200)
        })
    }

    private talkAsync(cmds: ArrayLike<number>) {
        return this.q.enqueue("talk", async () => {
            //console.log("TALK", cmds)
            await this.io.sendPacketAsync(new Uint8Array(cmds))
            let response = await this.recvAsync()
            if (response[0] !== cmds[0]) {
                const msg = `Bad response for ${cmds[0]} -> ${response[0]}`
                console.log(msg)
                response = await this.recvAsync()
                    .then(v => v, () => {
                        // throw the original error in case of timeout
                        this.error(msg)
                    })
                if (response[0] !== cmds[0])
                    this.error(msg)
            }
            return response
        })
    }

    private talkHexAsync(str: string) {
        return this.talkAsync(fromHex(str.replace(/ /g, "")))
    }

    private decodeString(buf: Uint8Array) {
        const len = buf[1]
        const ss = buf.slice(2, 2 + len)
        return uint8ArrayToString(ss)
    }

    private dapDelay(micros: number) {
        const cmd = [0x09, 0, 0]
        if (micros > 0xffff)
            this.error("too large delay")
        write16(cmd, 1, micros)
        return this.talkAsync(cmd)
    }

    private async setBaudRate() {
        const setBaud = [0x82, 0, 0, 0, 0]
        write32(setBaud, 1, 115200)
        await this.talkAsync(setBaud) // this reset the board on 0255
    }

    private async xchgLoop() {
        let currSend: SendItem
        for (; ;) {
            let numev = 0
            let inp = await this.readBytes(this.xchgAddr + 12, 256, true)
            if (inp[2]) {
                await this.writeWord(this.xchgAddr + 12, 0)
                await this.triggerIRQ()
                inp = inp.slice(0, inp[2] + 12)
                this._onJDMsg(inp)
                numev++
            }

            let sendFree = false
            if (currSend) {
                const send = await this.readBytes(this.xchgAddr + 12 + 256, 4)
                if (!send[2]) {
                    currSend.cb()
                    currSend = null
                    sendFree = true
                    numev++
                }
            }

            if (!currSend && this.sendQ.length) {
                if (!sendFree) {
                    const send = await this.readBytes(this.xchgAddr + 12 + 256, 4)
                    if (!send[2])
                        sendFree = true
                }
                if (sendFree) {
                    currSend = this.sendQ.shift()
                    const bbody = currSend.buf.slice(4)
                    await this.writeWords(this.xchgAddr + 12 + 256 + 4, new Uint32Array(bbody.buffer))
                    const bhead = currSend.buf.slice(0, 4)
                    await this.writeWords(this.xchgAddr + 12 + 256, new Uint32Array(bhead.buffer))
                    await this.triggerIRQ()
                    numev++
                }
            }

            const buf = await this.talkAsync([0x83])
            const str = this.decodeString(buf)
            if (str != "") {
                console.log("SERIAL: " + str)
                numev++
            }

            if (numev == 0)
                await this.dapDelay(1000)
        }
    }

    private async talkStringAsync(...cmds: number[]) {
        return this.talkAsync(cmds)
            .then(buf => this.decodeString(buf))
    }

    private async readDP(reg: number) {
        const nums = [0x05, 0, 1, 2 | reg, 0, 0, 0, 0]
        const buf = await this.talkAsync(nums)
        return read32(buf, 3)
    }

    private async setupTAR(addr: number) {
        const nums = [5, 0, 2, 1, 0x52, 0, 0, 0x23, 5, 0, 0, 0, 0]
        write32(nums, 9, addr)
        await this.talkAsync(nums)
    }

    private async writeWords(addr: number, data: Uint32Array) {
        await this.setupTAR(addr)

        const MAX = 0xE
        let ptr = 0
        const reqHd = [6, 0, MAX, 0, 0xD]
        for (let i = 0; i < MAX * 4; ++i) reqHd.push(0)
        const req = new Uint8Array(reqHd)
        let overhang = 1
        let ptrTX = 0
        const count = data.length
        const dataBytes = new Uint8Array(data.buffer)
        let lastCh = MAX

        //console.log("WRITE", addr.toString(16), data)

        await this.q.enqueue("talk", async () => {
            while (ptr < count) {
                const ch = Math.min(count - ptrTX, MAX)
                if (ch) {
                    req[2] = ch
                    req.set(dataBytes.slice(ptrTX * 4, (ptrTX + ch) * 4), 5)
                    await this.io.sendPacketAsync(ch == MAX ? req : req.slice(0, 5 + 4 * ch))
                    ptrTX += ch
                    lastCh = ch
                }
                if (overhang-- > 0)
                    continue
                const buf = await this.recvAsync()
                if (buf[0] != req[0])
                    this.error("bad response")
                if (buf[1] != MAX && buf[1] != lastCh)
                    this.error("bad response2")
                ptr += buf[1]
            }
        })
    }

    private async readBytes(addr: number, count: number, jdmode = false) {
        if (addr & 3 || count & 3)
            this.error("unaligned")
        const b = await this.readWords(addr, count >> 2, jdmode)
        return new Uint8Array(b.buffer)
    }

    private async readWords(addr: number, count: number, jdmode = false) {
        await this.setupTAR(addr)
        const MAX = 0xE
        const res = new Uint32Array(count)
        let ptr = 0
        const req = new Uint8Array([6, 0, MAX, 0, 0xf])
        let overhang = 1
        let ptrTX = 0

        // console.log("READ", addr.toString(16), count)
        let numPending = 0
        await this.q.enqueue("talk", async () => {
            while (ptr < count || numPending) {
                const ch = Math.min(count - ptrTX, MAX)
                if (ch > 0) {
                    req[2] = ch
                    numPending++
                    await this.io.sendPacketAsync(req)
                    ptrTX += ch
                }
                if (overhang-- > 0)
                    continue
                const buf = await this.recvAsync()
                numPending--
                if (buf[0] != req[0])
                    this.error("bad response")
                const len = buf[1]
                const words = new Uint32Array(buf.slice(4, (1 + len) * 4).buffer)
                if (words.length != len)
                    this.error("bad response2")
                res.set(words, ptr)
                // limit transfer, according to JD frame size
                if (jdmode && ptr == 0) {
                    const frmsz = new Uint8Array(res.buffer)[2]
                    const words = (frmsz + 12 + 3) >> 2
                    if (count > words) count = words
                }
                ptr += words.length
            }
        })

        return res
    }

    private async findExchange() {
        const memStart = 0x2000_0000
        const memStop = memStart + 128 * 1024
        const checkSize = 1024

        let p0 = 0x20006000
        let p1 = 0x20006000 + checkSize

        const check = async (addr: number) => {
            if (addr < memStart)
                return null
            if (addr + checkSize > memStop)
                return null
            const buf = await this.readWords(addr, checkSize >> 2)
            for (let i = 0; i < buf.length; ++i) {
                if (buf[i] == 0x786D444A && buf[i + 1] == 0xB0A6C0E9)
                    return addr + (i << 2)
            }
            return 0
        }

        while (true) {
            const a0 = await check(p0)
            if (a0) return a0
            const a1 = await check(p1)
            if (a1) return a1
            if (a0 === null && a1 === null)
                return null
            p0 -= checkSize
            p1 += checkSize
        }
    }

    private async triggerIRQ() {
        const addr = 0xE000E200 + (this.irqn >> 5) * 4
        const data = new Uint32Array([1 << (this.irqn & 31)])
        await this.writeWords(addr, data)
    }

    private writeWord(addr: number, val: number) {
        return this.writeWords(addr, new Uint32Array([val]))
    }

    private async reset() {
        await this.writeWord(0xE000EDFC, 0) // DEMCR
        await this.writeWord(0xE000ED0C, 0x05FA0000 | (1 << 2)); // AIRCR
    }

    async postConnectAsync() {
        const devid = await this.talkStringAsync(0x80)
        if (/^9902/.test(devid))
            this.error(`micro:bit v1 is not supported. sorry.`)
        if (!/^990[3456789]/.test(devid))
            this.error(`Invalid Vendor0 response: ` + devid)

        this.io.log("DAPLink v" + await this.talkStringAsync(0x00, 0x04))

        await this.setBaudRate() // this may reset the board

        const freq = [0x11, 0, 0, 0, 0]
        write32(freq, 1, 10_000_000)
        await this.talkAsync(freq)

        const inits = [
            "02 00", // connect
            "04 00 64 00 00 00", // configure delays
            // SWD switch
            "12 38 FF FF FF FF FF FF FF",  // ones
            "12 10 9E E7", // SWD
            "12 38 FF FF FF FF FF FF FF",  // ones
            "12 08 00", // zero
            // read DPIDR
            "05 00 01 02 00 00 00 00",
            // clear errors
            "05 00 03 00 04 00 00 00 08 00 00 00 00 04 00 00 00 50",
        ]

        for (const ini of inits)
            await this.talkHexAsync(ini)

        for (let i = 0; i < 100; ++i) {
            const st = await this.readDP(4)
            const mask = (1 << 29) | (1 << 31)
            if ((st & mask) == mask)
                break
            await delay(20)
        }

        await this.reset()
        await delay(1000) // the actual minimum until mbbridge starts seems to be 700ms; give it some more time just in case

        const xchg = await this.findExchange()
        this.xchgAddr = xchg
        const info = await this.readBytes(xchg, 16)
        this.irqn = info[8]
        if (info[12 + 2] != 0xff)
            this.error("invalid memory; try power-cycling the micro:bit")
        // clear initial lock
        await this.writeWord(xchg + 12, 0)
        this.io.log(`exchange address: 0x${xchg.toString(16)}; irqn=${this.irqn}`)

        /* async */ this.xchgLoop()
    }
}
