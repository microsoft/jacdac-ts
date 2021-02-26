import { CMSISProto } from "./microbit"
import { USBOptions } from "./usb"
import {
    throwError,
    delay,
    assert,
    SMap,
    PromiseBuffer,
    PromiseQueue,
    memcpy,
    write32,
    write16,
    read16,
    encodeU32LE,
    read32,
    bufferToString,
} from "./utils"

const controlTransferGetReport = 0x01
const controlTransferSetReport = 0x09
const controlTransferOutReport = 0x200
const controlTransferInReport = 0x100

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

export class Transport {
    dev: USBDevice
    iface: USBInterface
    altIface: USBAlternateInterface
    epIn: USBEndpoint
    epOut: USBEndpoint
    readLoopStarted = false
    ready = false
    rawMode = false

    constructor(private usb: USBOptions) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onData = (v: Uint8Array) => {}
    onError = (e: Error) => {
        console.warn("usb error: " + (e ? e.stack : e))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    log(msg: string, v?: any) {
        if (v != undefined) console.log("usb: " + msg, v)
        else console.log("usb: " + msg)
    }

    private mkProto(): Proto {
        return this.isMicrobit ? new CMSISProto(this) : new HF2Proto(this)
    }

    private clearDev() {
        if (this.dev) {
            this.dev = null
            this.epIn = null
            this.epOut = null
        }
    }

    disconnectAsync(): Promise<void> {
        this.ready = false
        if (!this.dev) return Promise.resolve()
        this.log("close device")
        return this.dev
            .close()
            .catch(e => {
                // just ignore errors closing, most likely device just disconnected
                console.debug(e)
            })
            .then(() => {
                this.clearDev()
                return delay(500)
            })
    }

    recvPacketAsync(): Promise<Uint8Array> {
        if (!this.rawMode) this.error("rawMode required")
        return this.recvPacketCoreAsync()
    }

    private recvPacketCoreAsync(): Promise<Uint8Array> {
        const final = (res: USBInTransferResult) => {
            if (res.status != "ok") this.error("USB IN transfer failed")
            const arr = new Uint8Array(res.data.buffer)
            if (arr.length == 0) return this.recvPacketCoreAsync()
            return arr
        }

        if (!this.dev) return Promise.reject(new Error("Disconnected"))

        if (!this.epIn) {
            return this.dev
                .controlTransferIn(
                    {
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferGetReport,
                        value: controlTransferInReport,
                        index: this.iface.interfaceNumber,
                    },
                    64
                )
                .then(final)
        }

        return this.dev.transferIn(this.epIn.endpointNumber, 64).then(final)
    }

    error(msg: string) {
        this.onError(
            new Error(
                `device ${this.dev ? this.dev.productName : "n/a"} (${msg})`
            )
        )
    }

    private async readLoop() {
        if (this.rawMode || this.readLoopStarted) return
        this.readLoopStarted = true
        this.log("start read loop")

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (!this.ready) {
                break
                //await delay(300)
                //continue
            }

            try {
                const buf = await this.recvPacketCoreAsync()

                if (buf[0]) {
                    // we've got data; retry reading immedietly after processing it
                    this.onData(buf)
                } else {
                    // throttle down if no data coming
                    await delay(5)
                }
            } catch (err) {
                if (this.dev) {
                    this.onError(err)
                    await this.disconnectAsync()
                }
                await delay(300)
            }
        }
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev) return Promise.reject(new Error("Disconnected"))
        assert(pkt.length <= 64)
        if (!this.epOut) {
            return this.dev
                .controlTransferOut(
                    {
                        requestType: "class",
                        recipient: "interface",
                        request: controlTransferSetReport,
                        value: controlTransferOutReport,
                        index: this.iface.interfaceNumber,
                    },
                    pkt
                )
                .then(res => {
                    if (res.status != "ok")
                        this.error("USB CTRL OUT transfer failed")
                })
        }
        return this.dev
            .transferOut(this.epOut.endpointNumber, pkt)
            .then(res => {
                if (res.status != "ok") this.error("USB OUT transfer failed")
            })
    }

    get isMicrobit() {
        return (
            this.dev && this.dev.productId == 516 && this.dev.vendorId == 3368
        )
    }

    private checkDevice() {
        this.iface = undefined
        this.altIface = undefined
        if (!this.dev) return false
        this.log(
            "connect device: " +
                this.dev.manufacturerName +
                " " +
                this.dev.productName
        )
        // resolve interfaces
        const subcl = this.isMicrobit ? 0 : HF2_DEVICE_MAJOR
        for (const iface of this.dev.configuration.interfaces) {
            const alt = iface.alternates[0]
            if (alt.interfaceClass == 0xff && alt.interfaceSubclass == subcl) {
                this.iface = iface
                this.altIface = alt
                break
            }
        }
        if (this.isMicrobit) this.rawMode = true
        return !!this.iface
    }

    private async tryReconnectAsync() {
        try {
            const devices = await this.usb.getDevices()
            this.dev = devices[0]
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    private async requestDeviceAsync() {
        try {
            this.dev = await this.usb.requestDevice({
                filters: [
                    {
                        // hf2 devices (incl. arcade)
                        classCode: 255,
                        subclassCode: HF2_DEVICE_MAJOR,
                    },
                    {
                        // micro:bit v2
                        vendorId: 3368,
                        productId: 516,
                    },
                ],
            })
        } catch (e) {
            console.log(e)
            this.dev = undefined
        }
    }

    async connectAsync(background: boolean) {
        await this.tryReconnectAsync()
        if (!this.dev && !background) await this.requestDeviceAsync()
        // background call and no device, just give up for now
        if (!this.dev && background) throwError("device not paired", true)

        // let's connect!
        await this.openDeviceAsync()

        const proto = this.mkProto()
        try {
            await proto.postConnectAsync()
        } catch (e) {
            console.debug(e)
            await proto.disconnectAsync()
            throw e
        }

        return proto
    }

    private async openDeviceAsync() {
        if (!this.dev) throwError("device not found")
        if (!this.checkDevice()) throwError("device does not support HF2")

        await this.dev.open()
        await this.dev.selectConfiguration(1)
        if (this.altIface.endpoints.length) {
            this.epIn = this.altIface.endpoints.filter(
                e => e.direction == "in"
            )[0]
            this.epOut = this.altIface.endpoints.filter(
                e => e.direction == "out"
            )[0]
            assert(this.epIn.packetSize == 64)
            assert(this.epOut.packetSize == 64)
        }
        this.log("claim interface")
        await this.dev.claimInterface(this.iface.interfaceNumber)
        this.log("all connected")
        this.ready = true
        this.readLoop()
    }
}

export interface Proto {
    onJDMessage(f: (buf: Uint8Array) => void): void
    sendJDMessageAsync(buf: Uint8Array): Promise<void>
    postConnectAsync(): Promise<void>
    disconnectAsync(): Promise<void>
}

class HF2Proto implements Proto {
    eventHandlers: SMap<(buf: Uint8Array) => void> = {}
    msgs = new PromiseBuffer<Uint8Array>()
    cmdSeq = (Math.random() * 0xffff) | 0
    private lock = new PromiseQueue()

    constructor(private io: Transport) {
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
        return this.io.error(m)
    }

    talkAsync(cmd: number, data?: Uint8Array) {
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
                .shiftAsync(1000) // we wait up to a second
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
                    this.error(e)
                    return null
                })

        return this.lock.enqueue("talk", () =>
            this.sendMsgAsync(pkt).then(handleReturnAsync)
        )
    }

    private sendMsgAsync(buf: Uint8Array, serial = 0) {
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
        const msg = `hf2 serial: ${bufferToString(data)}`
        if (iserr) console.warn(msg)
        else console.log(msg)
    }

    async postConnectAsync() {
        await this.checkMode()
        const buf = await this.talkAsync(HF2_CMD_INFO)
        this.io.log("Connected to: " + bufferToString(buf))
    }

    private async checkMode() {
        // first check that we are not talking to a bootloader
        const info = await this.talkAsync(HF2_CMD_BININFO)
        const mode = read32(info, 0)
        this.io.log(`hf2 mode ${mode}`)
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
