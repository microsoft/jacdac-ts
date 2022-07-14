import { Proto } from "./proto"
import {
    throwError,
    PromiseQueue,
    write16,
    read16,
    crc,
    bufferConcat,
    delay,
    bufferEq,
    bufferToString,
    uint8ArrayToString,
    fromUTF8,
} from "../utils"
import { HF2_IO } from "./hf2"

// see https://github.com/microsoft/jacdac-c/blob/main/source/jd_usb.c#L5

const JD_USB_CMD_DISABLE_PKTS = 0x80
const JD_USB_CMD_ENABLE_PKTS = 0x81
const JD_USB_CMD_NOT_UNDERSTOOD = 0xff
const JD_QBYTE_MAGIC = 0xfe
const JD_QBYTE_LITERAL_MAGIC = 0xf9
const JD_QBYTE_BEGIN = 0xfa
const JD_QBYTE_STOP = 0xfb
const JD_QBYTE_CONT = 0xfc
const JD_QBYTE_END = 0xfd
const JD_QBYTE_MAX_SIZE = 64

export class JdUsbProto implements Proto {
    private lock = new PromiseQueue()
    private frameHandler = (b: Uint8Array) => {}

    private hf2Resp: Uint8Array
    private isHF2: boolean

    private usb_rx_was_magic = 0
    private usb_rx_state = 0
    private usb_rx_ptr = 0
    private rxbuf = new Uint8Array(256)

    constructor(private io: HF2_IO) {
        io.isFreeFlowing = true
        let acc: Uint8Array = null
        io.onData = buf => {
            if (acc) {
                buf = bufferConcat(acc, buf)
                acc = null
            }
            if (this.hf2Resp) {
                if (buf.length < this.hf2Resp.length) {
                    acc = buf
                    return
                }
                if (
                    bufferEq(
                        this.hf2Resp,
                        buf.slice(1, 1 + this.hf2Resp.length)
                    )
                )
                    this.isHF2 = true
                this.hf2Resp = null
            }
            if (this.isHF2) return
            this.decodeFrame(buf)
        }
    }

    private logError(msg: string) {
        console.error("JDUSB Error: " + msg)
    }

    private handleProcessingFrame(fr: Uint8Array) {
        const cmd = read16(fr, 14)
        this.io.log("processing: 0x" + cmd.toString(16))
    }

    private handleFrame(fr: Uint8Array) {
        const sz = fr[2] + 12
        if (fr.length < 4 || fr.length < sz) {
            this.logError("short frm")
            return
        }
        fr = fr.slice(0, sz)
        const c = crc(fr.slice(2))
        if (fr[0] != (c & 0xff) || fr[1] != c >> 8) {
            this.logError("crc err")
            return
        }

        const ff = new Uint8Array(8)
        ff.fill(0xff)

        if (fr[3] == 0xff && bufferEq(fr.slice(4, 12), ff)) {
            this.handleProcessingFrame(fr)
        } else {
            this.frameHandler(fr)
        }
    }

    private decodeFrame(buf: Uint8Array) {
        const serialBuf: number[] = []
        const jd_usb_serial_cb = (c: number) => {
            serialBuf.push(c)
        }

        for (let i = 0; i < buf.length; ++i) {
            let c = buf[i]
            if (this.usb_rx_was_magic) {
                if (c == JD_QBYTE_MAGIC) {
                    if (this.usb_rx_state) {
                        this.logError("dual magic")
                        // break out of frame state
                        this.usb_rx_state = 0
                        // pass on accumulated data as serial
                        jd_usb_serial_cb(JD_QBYTE_MAGIC)
                        jd_usb_serial_cb(JD_QBYTE_BEGIN)
                        for (let j = 0; j < this.usb_rx_ptr; ++j) {
                            jd_usb_serial_cb(this.rxbuf[j])
                        }
                    }
                    // 'c' will be passed to jd_usb_serial_cb() below
                } else {
                    this.usb_rx_was_magic = 0
                    switch (c) {
                        case JD_QBYTE_LITERAL_MAGIC:
                            c = JD_QBYTE_MAGIC
                            break
                        case JD_QBYTE_BEGIN:
                            if (this.usb_rx_ptr) this.logError("second begin")
                            this.usb_rx_ptr = 0
                        // fallthrough
                        case JD_QBYTE_CONT:
                            if (this.usb_rx_state)
                                this.logError("unfinished beg/cont")
                            this.usb_rx_state = c
                            continue
                        case JD_QBYTE_STOP:
                        case JD_QBYTE_END:
                            if (this.usb_rx_state) {
                                this.usb_rx_state = 0
                                if (c == JD_QBYTE_END) {
                                    this.handleFrame(
                                        this.rxbuf.slice(0, this.usb_rx_ptr)
                                    )
                                    this.usb_rx_ptr = 0
                                }
                            } else {
                                this.logError("mismatched stop")
                            }
                            continue
                        default:
                            if (this.usb_rx_state) {
                                this.logError("invalid quote")
                                this.usb_rx_state = 0
                            }
                            // either way, pass on directly
                            jd_usb_serial_cb(JD_QBYTE_MAGIC)
                            // c = c;
                            break
                    }
                }
            } else if (c == JD_QBYTE_MAGIC) {
                this.usb_rx_was_magic = 1
                continue
            }

            if (this.usb_rx_state) {
                if (this.usb_rx_ptr >= this.rxbuf.length) {
                    this.logError("frame ovf")
                    this.usb_rx_state = 0
                } else {
                    this.rxbuf[this.usb_rx_ptr++] = c
                }
            } else {
                jd_usb_serial_cb(c)
            }
        }

        if (serialBuf.length > 0)
            this.onSerial(new Uint8Array(serialBuf), false)
    }

    error(m: string) {
        return this.io?.error(m)
    }

    private processingPkt(serviceCommand: number) {
        const f = new Uint8Array(16)
        f.fill(0xff)
        f[12] = 0 // service_size
        f[2] = 4 // _size
        write16(f, 14, serviceCommand)
        const c = crc(f.slice(2))
        f[0] = c & 0xff
        f[1] = c >> 8
        return f
    }

    private encodeFrame(buf: Uint8Array) {
        const c = crc(buf.slice(2))
        if (buf[0] + (buf[1] << 8) != c) throw new Error("bad crc")
        let curr = new Uint8Array(JD_QBYTE_MAX_SIZE)
        let dp = 0
        let res: Uint8Array[] = []
        curr[dp++] = JD_QBYTE_MAGIC
        curr[dp++] = JD_QBYTE_BEGIN
        for (let ptr = 0; ptr <= buf.length; ptr++) {
            const b = buf[ptr]
            const enclen = b == JD_QBYTE_MAGIC ? 2 : 1
            if (b == undefined || dp + enclen + 2 > curr.length) {
                curr[dp++] = JD_QBYTE_MAGIC
                curr[dp++] = b == undefined ? JD_QBYTE_END : JD_QBYTE_STOP
                res.push(curr.slice(0, dp))
                if (b == undefined) break
                dp = 0
                curr = new Uint8Array(JD_QBYTE_MAX_SIZE)
                curr[dp++] = JD_QBYTE_MAGIC
                curr[dp++] = JD_QBYTE_CONT
            }
            curr[dp++] = b
            if (b == JD_QBYTE_MAGIC) curr[dp++] = JD_QBYTE_LITERAL_MAGIC
        }
        return res
    }

    async detectHF2() {
        const pkt_en = this.encodeFrame(
            this.processingPkt(JD_USB_CMD_ENABLE_PKTS)
        )[0]
        const tag0 = 0x81
        const tag1 = 0x42
        const hf2_bininfo = new Uint8Array([
            0x48,
            0x01,
            0x00,
            0x00,
            0x00,
            tag0,
            tag1,
            0x00,
            0x00,
        ])
        this.hf2Resp = new Uint8Array([tag0, tag1, 0, 0])
        let frameToSend = hf2_bininfo
        while (frameToSend.length + pkt_en.length < 64) {
            frameToSend = bufferConcat(frameToSend, pkt_en)
        }
        for (let i = 0; i < 10; ++i) {
            this.io.log(`detect hf2 ${i}...`)
            await this.io.sendPacketAsync(bufferConcat(hf2_bininfo, pkt_en))
            await delay(50)
            if (this.hf2Resp == null) {
                if (this.isHF2) {
                    this.io.log("switching to HF2")
                    this.io.isFreeFlowing = false
                    return true
                } else {
                    this.io.log("detected JDUSB")
                    return false
                }
            }
        }
        throwError("JDUSB: can't connect, no HF2")
    }

    onJDMessage(f: (buf: Uint8Array) => void) {
        this.frameHandler = f
    }

    sendJDMessageAsync(fr: Uint8Array) {
        return this.lock.enqueue("talk", async () => {
            for (const buf of this.encodeFrame(fr)) {
                await this.io.sendPacketAsync(buf)
            }
        })
    }

    private serialData: Uint8Array
    private serialTimeout: any
    private colorState = ""
    serialLineCallback = (line: string, lineWithColor: string) => {}

    private fromUTF(line: Uint8Array) {
        let str = uint8ArrayToString(line)
        try {
            str = fromUTF8(str)
        } catch {}
        return str
    }

    private onSerial(data: Uint8Array, iserr: boolean) {
        if (this.serialTimeout !== undefined) {
            clearTimeout(this.serialTimeout)
            this.serialTimeout = undefined
        }

        let start = 0
        for (let i = 0; i < data.length; ++i) {
            if (data[i] == 13 || data[i] == 10) {
                let line = data.slice(start, i)
                if (this.serialData) {
                    line = bufferConcat(this.serialData, line)
                    this.serialData = null
                }
                if (line.length > 0) {
                    const sline = this.fromUTF(line)
                    // prepend this to line, to keep color from the previous line if any
                    const prevColor = this.colorState
                    const nocolors = sline.replace(/\x1B\[[0-9;]+m/, f => {
                        this.colorState = f // keep last color state
                        return ""
                    })
                    const withcolors = prevColor + sline
                    this.serialLineCallback(nocolors, withcolors)
                    console.debug("DEV: " + prevColor + sline)
                }
                start = i + 1
            }
        }

        if (start < data.length) {
            this.serialData = data.slice(start)
            this.serialTimeout = setTimeout(() => {
                this.serialTimeout = undefined
                if (this.serialData) {
                    console.debug("DEV-N: " + this.fromUTF(this.serialData))
                    this.serialData = null
                }
            }, 300)
        }
    }

    async postConnectAsync() {
        this.io.log("connected")
    }

    async disconnectAsync() {
        if (this.io) {
            const io = this.io
            this.io = undefined
            await io.disconnectAsync()
        }
    }
}
