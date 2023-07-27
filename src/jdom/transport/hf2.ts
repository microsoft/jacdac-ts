import { Proto } from "./proto"
import {
    assert,
    PromiseBuffer,
    PromiseQueue,
    memcpy,
    write32,
    write16,
    read16,
    encodeU32LE,
    read32,
    bufferToString,
} from "../utils"
import { HF2_TIMEOUT } from "../constants"
import { isCancelError, isTimeoutError, throwError } from "../error"

// see https://github.com/microsoft/uf2/blob/main/hf2.md for full spec
export const HF2_DEVICE_MAJOR = 42
export const HF2_CMD_BININFO = 0x0001 // no arguments
export const HF2_MODE_BOOTLOADER = 0x01
export const HF2_MODE_USERSPACE = 0x02
/*
struct HF2_BININFO_Result {
    uint32_t mode;
    uint32_t flash_page_size;
    uint32_t flash_num_pages;
    uint32_t max_message_size;
};
*/

export const HF2_CMD_INFO = 0x0002
// no arguments
// results is utf8 character array

export const HF2_CMD_RESET_INTO_APP = 0x0003 // no arguments, no result

export const HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004 // no arguments, no result

export const HF2_CMD_START_FLASH = 0x0005 // no arguments, no result

export const HF2_CMD_WRITE_FLASH_PAGE = 0x0006
/*
struct HF2_WRITE_FLASH_PAGE_Command {
    uint32_t target_addr;
    uint32_t data[flash_page_size];
};
*/
// no result

export const HF2_CMD_CHKSUM_PAGES = 0x0007
/*
struct HF2_CHKSUM_PAGES_Command {
    uint32_t target_addr;
    uint32_t num_pages;
};
struct HF2_CHKSUM_PAGES_Result {
    uint16_t chksums[num_pages];
};
*/

export const HF2_CMD_READ_WORDS = 0x0008
/*
struct HF2_READ_WORDS_Command {
    uint32_t target_addr;
    uint32_t num_words;
};
struct HF2_READ_WORDS_Result {
    uint32_t words[num_words];
};
*/

export const HF2_CMD_WRITE_WORDS = 0x0009
/*
struct HF2_WRITE_WORDS_Command {
    uint32_t target_addr;
    uint32_t num_words;
    uint32_t words[num_words];
};
*/
// no result

export const HF2_CMD_DMESG = 0x0010
// no arguments
// results is utf8 character array

export const HF2_FLAG_SERIAL_OUT = 0x80
export const HF2_FLAG_SERIAL_ERR = 0xc0
export const HF2_FLAG_CMDPKT_LAST = 0x40
export const HF2_FLAG_CMDPKT_BODY = 0x00
export const HF2_FLAG_MASK = 0xc0
export const HF2_SIZE_MASK = 63

export const HF2_STATUS_OK = 0x00
export const HF2_STATUS_INVALID_CMD = 0x01
export const HF2_STATUS_EXEC_ERR = 0x02
export const HF2_STATUS_EVENT = 0x80

// the eventId is overlayed on the tag+status; the mask corresponds
// to the HF2_STATUS_EVENT above
export const HF2_EV_MASK = 0x800000

export const HF2_CMD_JDS_CONFIG = 0x0020
export const HF2_CMD_JDS_SEND = 0x0021
export const HF2_EV_JDS_PACKET = 0x800020

export interface HF2_IO {
    // This is set to true when the IO object is used for Jacdac-USB protocol (not HF2), which
    // is not 64-byte-packet-based.
    isFreeFlowing?: boolean
    onData: (v: Uint8Array) => void
    onError: (e: Error) => void
    onLog?: (line: string) => void
    connectAsync(background: boolean): Promise<Proto>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(msg: string, v?: any): void
    disconnectAsync(): Promise<void>
    error(msg: string, code?: string): void
    sendPacketAsync(pkt: Uint8Array): Promise<void>
    description?: () => string
}

export class HF2Proto implements Proto {
    eventHandlers: Record<string, (buf: Uint8Array) => void> = {}
    msgs = new PromiseBuffer<Uint8Array>()
    cmdSeq = (Math.random() * 0xffff) | 0
    private lock = new PromiseQueue()

    constructor(private io: HF2_IO) {
        let frames: Uint8Array[] = []

        io.onData = buf => {
            const tp = buf[0] & HF2_FLAG_MASK
            const len = buf[0] & 63
            //console.log(`msg tp=${tp} len=${len}`)
            const frame = new Uint8Array(len)
            memcpy(frame, 0, buf, 1, len)
            if (tp & HF2_FLAG_SERIAL_OUT) {
                this.onSerial(frame, tp == HF2_FLAG_SERIAL_ERR)
                return
            }
            frames.push(frame)
            if (tp == HF2_FLAG_CMDPKT_BODY) {
                return
            } else {
                assert(tp == HF2_FLAG_CMDPKT_LAST)
                let total = 0
                for (const f of frames) total += f.length
                const r = new Uint8Array(total)
                let ptr = 0
                for (const f of frames) {
                    memcpy(r, ptr, f)
                    ptr += f.length
                }
                frames = []
                if (r[2] & HF2_STATUS_EVENT) {
                    // asynchronous event
                    this.handleEvent(r)
                } else {
                    this.msgs.push(r)
                }
            }
        }
    }

    error(m: string) {
        return this.io?.error(m)
    }

    talkAsync(cmd: number, data?: Uint8Array): Promise<Uint8Array> {
        if (!this.io) throwError("hf2: rogue instance")

        let len = 8
        if (data) len += data.length
        const pkt = new Uint8Array(len)
        const seq = ++this.cmdSeq & 0xffff
        write32(pkt, 0, cmd)
        write16(pkt, 4, seq)
        write16(pkt, 6, 0)
        if (data) memcpy(pkt, 8, data, 0, data.length)
        let numSkipped = 0
        const handleReturnAsync = (): Promise<Uint8Array> =>
            this.msgs
                .shiftAsync(HF2_TIMEOUT) // we wait up to a second
                .then(res => {
                    if (read16(res, 0) != seq) {
                        if (numSkipped < 3) {
                            numSkipped++
                            this.io.log(
                                `message out of sync, (${seq} vs ${read16(
                                    res,
                                    0
                                )}); will re-try`
                            )
                            return handleReturnAsync()
                        }
                        this.error("out of sync")
                    }
                    let info = ""
                    if (res[3]) info = "; info=" + res[3]
                    switch (res[2]) {
                        case HF2_STATUS_OK:
                            return res.slice(4)
                        case HF2_STATUS_INVALID_CMD:
                            this.error("invalid command" + info)
                            break
                        case HF2_STATUS_EXEC_ERR:
                            this.error("execution error" + info)
                            break
                        default:
                            this.error("error " + res[2] + info)
                            break
                    }
                    return null
                })
                .catch(e => {
                    console.debug(`hf2 error: ${e.message}; cmd=${cmd}`)
                    if (this.io) {
                        if (!isTimeoutError(e)) this.error(e)
                    }
                    return null
                })

        return this.enqueueTalk(async () => {
            if (!this.io) return null // disconnected
            return await this.sendMsgAsync(pkt).then(handleReturnAsync)
        })
    }

    private async enqueueTalk<T>(talk: () => Promise<T>): Promise<T> {
        try {
            if (!this.io) return undefined
            return this.lock.enqueue("talk", talk)
        } catch (e) {
            if (!this.io) return
            if (isCancelError(e)) return
            throw e
        }
    }

    private sendMsgAsync(buf: Uint8Array, serial = 0): Promise<void> {
        // Util.assert(buf.length <= this.maxMsgSize)
        const frame = new Uint8Array(64)
        const loop = (pos: number): Promise<void> => {
            let len = buf.length - pos
            if (len <= 0) return Promise.resolve()
            if (len > 63) {
                len = 63
                frame[0] = HF2_FLAG_CMDPKT_BODY
            } else {
                frame[0] = HF2_FLAG_CMDPKT_LAST
            }
            if (serial)
                frame[0] =
                    serial == 1 ? HF2_FLAG_SERIAL_OUT : HF2_FLAG_SERIAL_ERR
            frame[0] |= len
            for (let i = 0; i < len; ++i) frame[i + 1] = buf[pos + i]
            if (!this.io) return Promise.resolve()
            return this.io.sendPacketAsync(frame).then(() => loop(pos + len))
        }
        return loop(0)
    }

    onEvent(id: number, f: (buf: Uint8Array) => void) {
        assert(!!(id & HF2_EV_MASK))
        this.eventHandlers[id + ""] = f
    }

    onJDMessage(f: (buf: Uint8Array) => void) {
        this.talkAsync(HF2_CMD_JDS_CONFIG, encodeU32LE([1]))
        this.onEvent(HF2_EV_JDS_PACKET, f)
    }

    sendJDMessageAsync(buf: Uint8Array) {
        return this.talkAsync(HF2_CMD_JDS_SEND, buf).then(() => {})
    }

    handleEvent(buf: Uint8Array) {
        const evid = read32(buf, 0)
        const f = this.eventHandlers[evid + ""]
        if (f) {
            f(buf.slice(4))
        } else {
            this.io.log("unhandled event: " + evid.toString(16))
            // We can get these before we're ready to recv; this is fine.
            //if (evid === 0x800020) {
            //    this.io.onError(new Error("hf2 corrupted"))
            //}
        }
    }
    onSerial(data: Uint8Array, iserr: boolean) {
        // TODO: reenable?
        //const line = bufferToString(data).replace(/[\r\n]*$/, "")
        //const msg = `hf2: ${line}`
        //if (iserr) console.log(msg)
        //else console.debug(msg)
    }

    async postConnectAsync() {
        await this.checkMode()
        const buf = await this.talkAsync(HF2_CMD_INFO)
        this.io.log("connected to " + bufferToString(buf))
    }

    private async checkMode() {
        // first check that we are not talking to a bootloader
        const info = await this.talkAsync(HF2_CMD_BININFO)
        if (!info) throwError("device disconnected")

        const mode = read32(info, 0)
        this.io.log(`mode ${mode}`)
        if (mode == HF2_MODE_USERSPACE) {
            // all good
            this.io.log(`device in user-space mode`)
        } else if (mode == HF2_MODE_BOOTLOADER) {
            this.io.log(
                `device in bootloader mode, reseting into user-space mode`
            )
            await this.talkAsync(HF2_CMD_RESET_INTO_APP)
            // and fail
            throwError("Device in bootloader mode")
        } else {
            // unknown mdoe
            throwError("Unknown device operation mode")
        }
    }

    async disconnectAsync() {
        if (this.io) {
            const io = this.io
            this.io = undefined
            await io.disconnectAsync()
        }
    }
}
