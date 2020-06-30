import * as U from "./utils"
import { bufferToArray, NumberFormat, getNumber } from "./buffer"
import { Bus } from "./bus"
import { Packet } from "./packet"
import { Device } from "./device"
import { CMD_CTRL_RESET, SRV_BOOTLOADER, SRV_CTRL, CMD_ADVERTISEMENT_DATA } from "./constants"
import { unpack, pack } from "./struct"
import { assert } from "./utils"

const BL_CMD_PAGE_DATA = 0x80
const BL_CMD_SET_SESSION = 0x81
const BL_SUBPAGE_SIZE = 208
const numRetries = 3

let _startTime = 0
// set to null when no flashing in progress
let flashers: FlashClient[]

export interface FirmwarePage {
    data: Uint8Array;
    targetAddress: number;
}

export interface FirmwareBlob {
    pages: FirmwarePage[];
    deviceClass: number;
    name: string;
}

function timestamp() {
    if (!_startTime)
        _startTime = Date.now()
    return Date.now() - _startTime
}

function log(msg: string) {
    console.log(`BL [${timestamp()}ms]: ${msg}`)
}

class FlashClient {
    private pageSize: number
    private flashSize: number
    private sessionId: number
    private classClients: FlashClient[]
    private lastStatus: Packet
    private pending: boolean
    public dev_class: number
    public device: Device
    private didReset = false

    constructor(private bus: Bus, adpkt: Packet) {
        const d = bufferToArray(adpkt.data, NumberFormat.UInt32LE)
        this.pageSize = d[1]
        this.flashSize = d[2]
        this.dev_class = d[3]
        this.device = adpkt.dev
    }

    handlePacket(pkt: Packet) {
        if (pkt.service_command == BL_CMD_PAGE_DATA)
            this.lastStatus = pkt
    }

    start() { }

    async sendCommandAsync(p: Packet) {
        p.service_number = 1
        await p.sendCmdAsync(this.device)
    }

    private async startFlashAsync() {
        this.sessionId = (Math.random() * 0x10000000) | 0
        for (let d of this.classClients) {
            d.start()
            log(`flashing ${d.device.shortId}; available flash=${d.flashSize / 1024}kb; page=${d.pageSize}b`)
        }

        const setsession = Packet.packed(BL_CMD_SET_SESSION, "I", [this.sessionId])

        this.allPending()

        for (let i = 0; i < numRetries; ++i) {
            for (let d of this.classClients) {
                if (d.pending) {
                    if (d.lastStatus && d.lastStatus.getNumber(NumberFormat.UInt32LE, 0) == this.sessionId) {
                        d.pending = false
                    } else {
                        d.lastStatus = null
                        log(`set session on ${d.device}`)
                        await d.sendCommandAsync(setsession)
                    }
                    await U.delay(5)
                }
            }
            if (this.numPending() == 0)
                break
            await this.waitForStatusAsync()
        }

        if (this.numPending())
            throw new Error("Can't set session id")
    }

    async maybeReset() {
        if (!this.didReset) {
            const rst = Packet.onlyHeader(CMD_CTRL_RESET)
            rst.service_number = 0
            await rst.sendCmdAsync(this.device)
            this.didReset = true
        }
    }

    private async endFlashAsync() {
        log(`done flashing ${this.device}; resetting`)

        for (let f of this.classClients) {
            f.didReset = false
            await f.maybeReset()
        }
    }

    private allPending() {
        for (let c of this.classClients) {
            c.pending = true
            c.lastStatus = null
        }
    }

    private numPending() {
        let num = 0
        for (let c of this.classClients)
            if (c.pending) num++
        return num
    }

    private async waitForStatusAsync() {
        for (let i = 0; i < 100; ++i) {
            if (this.classClients.every(c => c.lastStatus != null))
                break
            await U.delay(5)
        }
    }

    private async flashPage(page: FirmwarePage) {
        const pageAddr = page.targetAddress
        const pageSize = this.pageSize
        const numSubpage = ((pageSize + BL_SUBPAGE_SIZE - 1) / BL_SUBPAGE_SIZE) | 0

        log(`flash at ${pageAddr & 0xffffff}`)

        for (let f of this.classClients)
            f.lastStatus = null

        this.allPending()
        for (let i = 0; i < numRetries; ++i) {
            let currSubpage = 0
            for (let suboff = 0; suboff < pageSize; suboff += BL_SUBPAGE_SIZE) {
                let sz = BL_SUBPAGE_SIZE
                if (suboff + sz > pageSize)
                    sz = pageSize - suboff
                const hd = pack("IHBB5I", [pageAddr, suboff, currSubpage++, numSubpage - 1, this.sessionId, 0, 0, 0, 0])
                assert(hd.length == 4 * 7)
                const p = Packet.from(BL_CMD_PAGE_DATA, U.bufferConcat(hd, page.data.slice(suboff, suboff + sz)))

                // in first round, just broadcast everything
                // in other rounds, broadcast everything except for last packet
                if (i == 0 || currSubpage < numSubpage)
                    await p.sendAsMultiCommandAsync(this.bus, SRV_BOOTLOADER)
                else {
                    for (let f of this.classClients)
                        if (f.pending) {
                            f.lastStatus = null
                            await f.sendCommandAsync(p)
                        }
                }
                await U.delay(5)
            }

            await this.waitForStatusAsync()

            for (let f of this.classClients) {
                if (f.pending) {
                    let err = ""
                    if (f.lastStatus) {
                        const [sess, berr, pageAddrR] = unpack(f.lastStatus.data, "III")
                        if (sess != this.sessionId)
                            err = "invalid session_id"
                        else if (pageAddrR != pageAddr)
                            err = "invalid page address"
                        else if (berr)
                            err = "err:" + berr
                    } else {
                        err = "timeout"
                    }
                    if (err) {
                        f.lastStatus = null
                        log(`retry ${f.device}: ${err}`)
                    } else {
                        f.pending = false
                    }
                }
            }

            if (this.numPending() == 0)
                return
        }

        throw new Error("too many retries")
    }

    public destroy() { }

    public async flashFirmwareBlob(fw: FirmwareBlob) {
        await this.startFlashAsync()

        for (const page of fw.pages) {
            if (page.data.length != this.pageSize)
                throw new Error("invalid page size")
            await this.flashPage(page)
        }

        await this.endFlashAsync()
    }


    public static async forDeviceClass(bus: Bus, dev_class: number) {
        if (!flashers)
            await makeBootloaderList(bus)
        const all = flashers.filter(f => f.dev_class == dev_class)
        if (all.length > 0)
            all[0].classClients = all
        return all[0]
    }
}

async function makeBootloaderList(bus: Bus) {
    log("resetting all devices")

    const rst = Packet.onlyHeader(CMD_CTRL_RESET)
    await rst.sendAsMultiCommandAsync(bus, SRV_CTRL)

    log("asking for bootloaders")

    if (flashers === undefined) {
        bus.on('packetReceive', (p: Packet) => {
            if (!flashers)
                return

            if (!p.is_command &&
                p.service_number == 1 &&
                p.service_command == CMD_ADVERTISEMENT_DATA &&
                p.getNumber(NumberFormat.UInt32LE, 0) == SRV_BOOTLOADER
            ) {
                if (!flashers.find(f => f.device.deviceId == p.device_identifier)) {
                    log(`new flasher`)
                    flashers.push(new FlashClient(bus, p))
                }
            }

            if (!p.is_command && p.service_number == 1) {
                const f = flashers.find(f => f.device.deviceId == p.device_identifier)
                if (f)
                    f.handlePacket(p)
            }
        })
    }
    flashers = []

    const bl_announce = Packet.onlyHeader(CMD_ADVERTISEMENT_DATA)
    // collect everyone for 1s
    for (let i = 0; i < 10; ++i) {
        await bl_announce.sendAsMultiCommandAsync(bus, SRV_BOOTLOADER)
        await U.delay(100)
    }

    if (flashers.length == 0) {
        log("no bootloaders reported; trying for another 10s")

        // the user is meant to connect their device now
        for (let i = 0; i < 100; ++i) {
            await bl_announce.sendAsMultiCommandAsync(bus, SRV_BOOTLOADER)
            await U.delay(100)
            // but we stop on the first encountered device
            if (flashers.length > 0)
                break
        }
    }

    if (flashers.length == 0)
        throw new Error("no devices to flash")

    log(`${flashers.length} bootloader(s) found; [0]:${flashers[0].dev_class.toString(16)}`)
}

const UF2_MAGIC_START0 = 0x0A324655;
const UF2_MAGIC_START1 = 0x9E5D5157;
const UF2_MAGIC_END = 0x0AB16F30;

export function parseUF2(uf2: Uint8Array): FirmwareBlob[] {
    const blobs: FirmwareBlob[] = []
    let currBlob: FirmwareBlob
    let addr = 0
    const pageSize = 1024 // TODO
    for (let off = 0; off < uf2.length; off += 512) {
        const header = uf2.slice(off, off + 32)
        let [magic0, magic1, _flags, trgaddr, payloadSize, blkNo, numBlocks, familyID] =
            bufferToArray(header, NumberFormat.UInt32LE)
        if (magic0 != UF2_MAGIC_START0 ||
            magic1 != UF2_MAGIC_START1 ||
            getNumber(uf2, NumberFormat.UInt32LE, 512 - 4) != UF2_MAGIC_END)
            throw new Error("invalid UF2")
        if (blkNo == 0) {
            flush()
            currBlob = {
                pages: [],
                deviceClass: familyID,
                name: "FW " + familyID.toString(16)
            }
        }
        let currPage = currBlob.pages[currBlob.pages.length - 1]
        if (!currPage || !(currPage.targetAddress <= trgaddr && trgaddr < currPage.targetAddress + pageSize)) {
            currPage = {
                targetAddress: trgaddr & ~(pageSize - 1),
                data: new Uint8Array(pageSize)
            }
            currPage.data.fill(0xff)
            currBlob.pages.push(currPage)
        }
        currPage.data.set(uf2.slice(off + 32, off + 32 + payloadSize), trgaddr - currPage.targetAddress)
    }
    flush()

    function flush() {
        if (currBlob)
            blobs.push(currBlob)
    }
    return blobs
}

export async function flashFirmwareBlobs(bus: Bus, blobs: FirmwareBlob[]) {
    try {
        _startTime = Date.now()
        let numok = 0
        for (const blob of blobs) {
            const f = await FlashClient.forDeviceClass(bus, blob.deviceClass)
            if (!f) {
                log(`skipping ${blob.name}`)
                continue
            }
            log(`flashing ${blob.name}`)
            await f.flashFirmwareBlob(blob)
            numok++
        }
        // reset everyone else
        for (let f of flashers) {
            await f.maybeReset()
        }
    } finally {
        flashers = null
    }
}