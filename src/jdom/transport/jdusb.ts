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
    read32,
} from "../utils"
import { HF2_IO } from "./hf2"
import {
    JD_DEVICE_IDENTIFIER_BROADCAST_HIGH_MARK,
    JD_FRAME_FLAG_COMMAND,
    JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS,
    JD_FRAME_FLAG_LOOPBACK,
    JD_SERVICE_INDEX_BROADCAST,
    SRV_USB_BRIDGE,
    UsbBridgeCmd,
    UsbBridgeQByte,
} from "../constants"
import { jdpack } from "../pack"

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

        if (
            (fr[3] & JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS) != 0 &&
            read32(fr, 4) == SRV_USB_BRIDGE
        ) {
            this.handleProcessingFrame(fr)
        } else {
            this.frameHandler(fr)
        }
    }

    private decodeFrame(buf: Uint8Array) {
        let serialBuf: number[] = []
        const jd_usb_serial_cb = (c: number) => {
            serialBuf.push(c)
        }

        const frame_error = () => {
            // break out of frame state
            this.usb_rx_state = 0
            // pass on accumulated data as serial
            for (let j = 0; j < this.usb_rx_ptr; ++j) {
                jd_usb_serial_cb(this.rxbuf[j])
            }
            this.usb_rx_ptr = 0
        }

        for (let i = 0; i < buf.length; ++i) {
            let c = buf[i]
            if (this.usb_rx_was_magic) {
                if (c == UsbBridgeQByte.Magic) {
                    if (this.usb_rx_state) {
                        this.logError("dual magic")
                        frame_error()
                        continue
                    }
                    // 'c' will be passed to jd_usb_serial_cb() below
                } else {
                    this.usb_rx_was_magic = 0
                    switch (c) {
                        case UsbBridgeQByte.LiteralMagic:
                            c = UsbBridgeQByte.Magic
                            break
                        case UsbBridgeQByte.FrameStart:
                            if (this.usb_rx_ptr) {
                                this.logError("second begin")
                                frame_error()
                            }
                            this.usb_rx_state = c
                            continue
                        case UsbBridgeQByte.FrameEnd:
                            if (this.usb_rx_state) {
                                this.usb_rx_state = 0
                                const fr = this.rxbuf.slice(0, this.usb_rx_ptr)
                                this.handleFrame(fr)
                                this.usb_rx_ptr = 0
                            } else {
                                this.logError("mismatched stop")
                            }
                            continue

                        case UsbBridgeQByte.SerialGap:
                            if (serialBuf.length > 0)
                                this.onSerial(new Uint8Array(serialBuf), false)
                            serialBuf = []
                            this.onSerialGap()
                            continue

                        case UsbBridgeQByte.FrameGap:
                            this.onFrameGap()
                            continue

                        case UsbBridgeQByte.Reserved:
                            continue // ignore

                        default:
                            if (this.usb_rx_state) {
                                this.logError("invalid quote")
                                frame_error()
                            }
                            // either way, pass on directly
                            jd_usb_serial_cb(UsbBridgeQByte.Magic)
                            // c = c;
                            break
                    }
                }
            } else if (c == UsbBridgeQByte.Magic) {
                this.usb_rx_was_magic = 1
                continue
            }

            if (this.usb_rx_state) {
                if (this.usb_rx_ptr >= this.rxbuf.length) {
                    this.logError("frame ovf")
                    frame_error()
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
        const f = jdpack("u16 u8 u8 u32 u32 u8 u8 u16", [
            0, // crc
            4, // _size
            JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS |
                JD_FRAME_FLAG_COMMAND |
                JD_FRAME_FLAG_LOOPBACK,
            SRV_USB_BRIDGE,
            JD_DEVICE_IDENTIFIER_BROADCAST_HIGH_MARK,
            0, // service size
            JD_SERVICE_INDEX_BROADCAST,
            serviceCommand,
        ])
        const c = crc(f.slice(2))
        f[0] = c & 0xff
        f[1] = c >> 8
        return f
    }

    private encodeFrame(buf: Uint8Array) {
        const c = crc(buf.slice(2))
        if (buf[0] + (buf[1] << 8) != c) throw new Error("bad crc")

        const outp: number[] = []

        outp.push(UsbBridgeQByte.Magic)
        outp.push(UsbBridgeQByte.FrameStart)

        for (let ptr = 0; ptr < buf.length; ptr++) {
            const b = buf[ptr]
            outp.push(b)
            if (b == UsbBridgeQByte.Magic)
                outp.push(UsbBridgeQByte.LiteralMagic)
        }

        outp.push(UsbBridgeQByte.Magic)
        outp.push(UsbBridgeQByte.FrameEnd)

        const res: Uint8Array[] = []
        for (let i = 0; i < outp.length; i += 64) {
            res.push(new Uint8Array(outp.slice(i, i + 64)))
        }

        return res
    }

    async detectHF2() {
        const pkt_en = this.encodeFrame(
            this.processingPkt(UsbBridgeCmd.EnablePackets)
        )[0]
        // tag0,1 are arbitrary, but should be somewhat unusual
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
        return this.lock.enqueue("talk", async () => {
            for (let i = 0; i < 10; ++i) {
                this.io.log(`detect hf2 ${i}...`)
                await this.io.sendPacketAsync(frameToSend)
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
        })
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

    private flushSerial() {
        if (this.serialData) {
            console.debug("DEV-N: " + this.fromUTF(this.serialData))
            this.serialData = null
        }
    }

    private onSerialGap() {
        this.flushSerial()
        console.debug("DEV-S: [...some serial output skipped...]")
    }

    private onFrameGap() {
        console.debug("DEV-S: [...some Jacdac packets skipped...]")
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
                    console.debug("DEV: " + withcolors)
                }
                start = i + 1
            }
        }

        if (start < data.length) {
            this.serialData = data.slice(start)
            this.serialTimeout = setTimeout(() => {
                this.serialTimeout = undefined
                this.flushSerial()
            }, 300)
        }
    }

    async postConnectAsync() {
        await this.sendJDMessageAsync(
            this.processingPkt(UsbBridgeCmd.EnableLog)
        )
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
