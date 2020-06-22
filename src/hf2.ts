import * as webusb from "webusb"
import * as U from "./pxtutils"

const controlTransferGetReport = 0x01;
const controlTransferSetReport = 0x09;
const controlTransferOutReport = 0x200;
const controlTransferInReport = 0x100;

// see https://github.com/microsoft/uf2/blob/master/hf2.md for full spec
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

export const HF2_CMD_RESET_INTO_APP = 0x0003// no arguments, no result

export const HF2_CMD_RESET_INTO_BOOTLOADER = 0x0004  // no arguments, no result

export const HF2_CMD_START_FLASH = 0x0005   // no arguments, no result

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
export const HF2_FLAG_SERIAL_ERR = 0xC0
export const HF2_FLAG_CMDPKT_LAST = 0x40
export const HF2_FLAG_CMDPKT_BODY = 0x00
export const HF2_FLAG_MASK = 0xC0
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
    dev: USBDevice;
    iface: USBInterface;
    altIface: USBAlternateInterface;
    epIn: USBEndpoint;
    epOut: USBEndpoint;
    readLoopStarted = false;
    ready = false;

    onData = (v: Uint8Array) => { };
    onError = (e: Error) => {
        console.error("HF2 error: " + (e ? e.stack : e))
    };

    log(msg: string, v?: any) {
        if (v != undefined)
            console.log("HF2: " + msg, v)
        else
            console.log("HF2: " + msg)
    }


    private clearDev() {
        if (this.dev) {
            this.dev = null
            this.epIn = null
            this.epOut = null
        }
    }

    disconnectAsync() {
        this.ready = false
        if (!this.dev) return Promise.resolve()
        this.log("close device")
        return this.dev.close()
            .catch(e => {
                // just ignore errors closing, most likely device just disconnected
            })
            .then(() => {
                this.clearDev()
                return U.delay(500)
            })
    }

    private recvPacketAsync(): Promise<Uint8Array> {
        let final = (res: USBInTransferResult) => {
            if (res.status != "ok")
                this.error("USB IN transfer failed")
            let arr = new Uint8Array(res.data.buffer)
            if (arr.length == 0)
                return this.recvPacketAsync()
            return arr
        }

        if (!this.dev)
            return Promise.reject(new Error("Disconnected"))

        if (!this.epIn) {
            return this.dev.controlTransferIn({
                requestType: "class",
                recipient: "interface",
                request: controlTransferGetReport,
                value: controlTransferInReport,
                index: this.iface.interfaceNumber
            }, 64).then(final)
        }

        return this.dev.transferIn(this.epIn.endpointNumber, 64)
            .then(final)
    }

    error(msg: string) {
        throw new Error(`USB error on device ${this.dev ? this.dev.productName : "n/a"} (${msg})`)
    }

    private async readLoop() {
        if (this.readLoopStarted)
            return
        this.readLoopStarted = true
        this.log("start read loop")

        while (true) {
            if (!this.ready) {
                break
                //await U.delay(300)
                //continue
            }

            try {
                const buf = await this.recvPacketAsync()

                if (buf[0]) {
                    // we've got data; retry reading immedietly after processing it
                    this.onData(buf)
                } else {
                    // throttle down if no data coming
                    await U.delay(5)
                }
            } catch (err) {
                if (this.dev)
                    this.onError(err)
                await U.delay(300)
            }
        }
    }

    sendPacketAsync(pkt: Uint8Array) {
        if (!this.dev)
            return Promise.reject(new Error("Disconnected"))
        U.assert(pkt.length <= 64)
        if (!this.epOut) {
            return this.dev.controlTransferOut({
                requestType: "class",
                recipient: "interface",
                request: controlTransferSetReport,
                value: controlTransferOutReport,
                index: this.iface.interfaceNumber
            }, pkt).then(res => {
                if (res.status != "ok")
                    this.error("USB CTRL OUT transfer failed")
            })
        }
        return this.dev.transferOut(this.epOut.endpointNumber, pkt)
            .then(res => {
                if (res.status != "ok")
                    this.error("USB OUT transfer failed")
            })
    }


    async init() {
        const usb = new webusb.USB({
            devicesFound: async devices => {
                for (const device of devices) {
                    if (device.deviceVersionMajor == 42) {
                        for (const iface of device.configuration.interfaces) {
                            const alt = iface.alternates[0]
                            if (alt.interfaceClass == 0xff && alt.interfaceSubclass == 42) {
                                this.dev = device
                                this.iface = iface
                                this.altIface = alt
                                return device
                            }
                        }
                    }
                }

                return undefined
            }
        })

        this.dev = await usb.requestDevice({ filters: [{}] })
        this.log("connect device: " + this.dev.manufacturerName + " " + this.dev.productName)

        await this.dev.open()
        await this.dev.selectConfiguration(1)

        if (this.altIface.endpoints.length) {
            this.epIn = this.altIface.endpoints.filter(e => e.direction == "in")[0]
            this.epOut = this.altIface.endpoints.filter(e => e.direction == "out")[0]
            U.assert(this.epIn.packetSize == 64);
            U.assert(this.epOut.packetSize == 64);
        }
        this.log("claim interface")
        await this.dev.claimInterface(this.iface.interfaceNumber)
        this.log("all connected")
        this.ready = true
        this.readLoop()
    }
}

export class Proto {
    eventHandlers: U.SMap<(buf: Uint8Array) => void> = {}
    msgs = new U.PromiseBuffer<Uint8Array>()
    cmdSeq = (Math.random() * 0xffff) | 0;
    private lock = new U.PromiseQueue();

    constructor(public io: Transport) {
        let frames: Uint8Array[] = []

        io.onData = buf => {
            let tp = buf[0] & HF2_FLAG_MASK
            let len = buf[0] & 63
            //console.log(`msg tp=${tp} len=${len}`)
            let frame = new Uint8Array(len)
            U.memcpy(frame, 0, buf, 1, len)
            if (tp & HF2_FLAG_SERIAL_OUT) {
                this.onSerial(frame, tp == HF2_FLAG_SERIAL_ERR)
                return
            }
            frames.push(frame)
            if (tp == HF2_FLAG_CMDPKT_BODY) {
                return
            } else {
                U.assert(tp == HF2_FLAG_CMDPKT_LAST)
                let total = 0
                for (let f of frames) total += f.length
                let r = new Uint8Array(total)
                let ptr = 0
                for (let f of frames) {
                    U.memcpy(r, ptr, f)
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
        let pkt = new Uint8Array(len)
        let seq = ++this.cmdSeq & 0xffff
        U.write32(pkt, 0, cmd);
        U.write16(pkt, 4, seq);
        U.write16(pkt, 6, 0);
        if (data)
            U.memcpy(pkt, 8, data, 0, data.length)
        let numSkipped = 0
        let handleReturnAsync = (): Promise<Uint8Array> =>
            this.msgs.shiftAsync(1000) // we wait up to a second
                .then(res => {
                    if (U.read16(res, 0) != seq) {
                        if (numSkipped < 3) {
                            numSkipped++
                            this.io.log(`message out of sync, (${seq} vs ${U.read16(res, 0)}); will re-try`)
                            return handleReturnAsync()
                        }
                        this.error("out of sync")
                    }
                    let info = ""
                    if (res[3])
                        info = "; info=" + res[3]
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

        return this.lock.enqueue("talk", () =>
            this.sendMsgAsync(pkt)
                .then(handleReturnAsync))
    }


    private sendMsgAsync(buf: Uint8Array, serial: number = 0) {
        // Util.assert(buf.length <= this.maxMsgSize)
        let frame = new Uint8Array(64)
        let loop = (pos: number): Promise<void> => {
            let len = buf.length - pos
            if (len <= 0) return Promise.resolve()
            if (len > 63) {
                len = 63
                frame[0] = HF2_FLAG_CMDPKT_BODY;
            } else {
                frame[0] = HF2_FLAG_CMDPKT_LAST;
            }
            if (serial) frame[0] = serial == 1 ? HF2_FLAG_SERIAL_OUT : HF2_FLAG_SERIAL_ERR;
            frame[0] |= len;
            for (let i = 0; i < len; ++i)
                frame[i + 1] = buf[pos + i]
            return this.io.sendPacketAsync(frame)
                .then(() => loop(pos + len))
        }
        return loop(0)
    }

    onEvent(id: number, f: (buf: Uint8Array) => void) {
        U.assert(!!(id & HF2_EV_MASK))
        this.eventHandlers[id + ""] = f
    }

    onJDMessage(f: (buf: Uint8Array) => void) {
        this.talkAsync(HF2_CMD_JDS_CONFIG, U.encodeU32LE([1]))
        this.onEvent(HF2_EV_JDS_PACKET, f)
    }

    sendJDMessageAsync(buf: Uint8Array) {
        return this.talkAsync(HF2_CMD_JDS_SEND, buf)
    }

    handleEvent(buf: Uint8Array) {
        let evid = U.read32(buf, 0)
        let f = this.eventHandlers[evid + ""]
        if (f) {
            f(buf.slice(4))
        } else {
            this.io.log("unhandled event: " + evid.toString(16))
        }
    }
    onSerial(data: Uint8Array, iserr: boolean) {
        console.log("SERIAL:", U.bufferToString(data))
    }

    async init() {
        await this.io.init()
        const buf = await this.talkAsync(HF2_CMD_INFO)
        this.io.log("Connected to: " + U.bufferToString(buf))
    }
}
