import { bufferToArray, NumberFormat, getNumber } from "./buffer"
import { JDBus } from "./bus"
import Packet from "./packet"
import { JDDevice } from "./device"
import { ControlCmd, SRV_BOOTLOADER, SRV_CTRL, CMD_ADVERTISEMENT_DATA, CMD_GET_REG, CMD_REG_MASK, ControlReg, PACKET_REPORT } from "./constants"
import { assert, delay, bufferConcat, bufferToString, SMap, strcmp, readBlobToUint8Array } from "./utils"
import { jdpack, jdunpack } from "./pack"

const BL_CMD_PAGE_DATA = 0x80
const BL_CMD_SET_SESSION = 0x81
const BL_SUBPAGE_SIZE = 208
const numRetries = 15

let _startTime = 0

const uf2ExtTags: SMap<number> = {
    version: -0x9fc7bc,
    name: -0x650d9d,
    pageSize: 0x0be9f7,
    firmwareIdentifier: 0xc8a729
}

export interface FirmwarePage {
    data: Uint8Array;
    targetAddress: number;
}

export interface FirmwareBlob {
    pages: FirmwarePage[];
    firmwareIdentifier: number;
    pageSize: number;
    name: string;
    version: string;
    // name of the file or repo
    store: string;
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
    classClients: FlashClient[]
    private lastStatus: Packet
    private pending: boolean
    public dev_class: number
    public device: JDDevice

    constructor(private bus: JDBus, adpkt: Packet) {
        const d = bufferToArray(adpkt.data, NumberFormat.UInt32LE)
        this.pageSize = d[1]
        this.flashSize = d[2]
        this.dev_class = d[3]
        this.device = adpkt.device
        this.handlePacket = this.handlePacket.bind(this)
    }

    private handlePacket(pkt: Packet) {
        if (pkt.serviceCommand == BL_CMD_PAGE_DATA)
            this.lastStatus = pkt
    }

    private start() {
        this.device.on(PACKET_REPORT, this.handlePacket)
    }

    private stop() {
        this.device.off(PACKET_REPORT, this.handlePacket)
    }

    private async sendCommandAsync(p: Packet) {
        p.serviceIndex = 1
        await p.sendCmdAsync(this.device)
    }

    private async startFlashAsync() {
        this.sessionId = (Math.random() * 0x10000000) | 0
        for (let d of this.classClients) {
            d.start()
            log(`flashing ${d.device.shortId}; available flash=${d.flashSize / 1024}kb; page=${d.pageSize}b`)
        }

        const setsession = Packet.jdpacked<[number]>(BL_CMD_SET_SESSION, "u32", [this.sessionId])

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
                    await delay(5)
                }
            }
            if (this.numPending() == 0)
                break
            await this.waitForStatusAsync()
        }

        if (this.numPending())
            throw new Error("Can't set session id")
    }

    private async endFlashAsync() {
        for (let f of this.classClients) {
            await delay(10)
            await f.device.sendCtrlCommand(ControlCmd.Reset)
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
            await delay(5)
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
                const hd = jdpack("u32 u16 u8 u8 u32 u32 u32 u32 u32", [pageAddr, suboff, currSubpage++, numSubpage - 1, this.sessionId, 0, 0, 0, 0])
                assert(hd.length == 4 * 7)
                const p = Packet.from(BL_CMD_PAGE_DATA, bufferConcat(hd, page.data.slice(suboff, suboff + sz)))

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
                await delay(5)
            }

            await this.waitForStatusAsync()

            for (let f of this.classClients) {
                if (f.pending) {
                    let err = ""
                    if (f.lastStatus) {
                        const [sess, berr, pageAddrR] = jdunpack<[number, number, number]>(f.lastStatus.data, "u32 u32 u32")
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

    public async flashFirmwareBlob(fw: FirmwareBlob, progress?: (perc: number) => void) {
        const total = fw.pages.length + 12
        let idx = 0
        const prog = () => {
            if (progress)
                progress(100 * idx / total)
            idx++
        }
        try {
            prog()
            await this.startFlashAsync()
            prog()
            for (const page of fw.pages) {
                if (page.data.length != this.pageSize)
                    throw new Error("invalid page size")
                await this.flashPage(page)
                prog()
            }
        } finally {
            try {
                // even if something failed, try to reset everyone
                await this.endFlashAsync()
                prog()
                // wait until we're out of bootloader mode; otherwise the subsequent scan will keep devices in BL mode
                for (let i = 0; i < 10; ++i) {
                    await delay(150)
                    prog()
                }
            } finally {
                // even if resetting failed, unregister event listeners
                for (let d of this.classClients) {
                    d.stop()
                }
            }
        }
    }
}

const UF2_MAGIC_START0 = 0x0A324655;
const UF2_MAGIC_START1 = 0x9E5D5157;
const UF2_MAGIC_END = 0x0AB16F30;

export function parseUF2(uf2: Uint8Array, store: string): FirmwareBlob[] {
    const blobs: FirmwareBlob[] = []
    let currBlob: FirmwareBlob
    for (let off = 0; off < uf2.length; off += 512) {
        const header = uf2.slice(off, off + 32)
        let [magic0, magic1, flags, trgaddr, payloadSize, blkNo, numBlocks, familyID] =
            bufferToArray(header, NumberFormat.UInt32LE)
        if (magic0 != UF2_MAGIC_START0 ||
            magic1 != UF2_MAGIC_START1 ||
            getNumber(uf2, NumberFormat.UInt32LE, off + 512 - 4) != UF2_MAGIC_END)
            throw new Error("invalid UF2")
        if (blkNo == 0) {
            flush()
            currBlob = {
                pages: [],
                firmwareIdentifier: familyID,
                version: "",
                pageSize: 1024,
                name: "FW " + familyID.toString(16),
                store
            }
        }
        if (flags & 0x8000)
            parseExtTags(uf2.slice(off + 32 + payloadSize, off + 512))
        const pageSize = currBlob.pageSize || 1024
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
    return blobs

    function flush() {
        if (currBlob)
            blobs.push(currBlob)
    }

    function parseExtTags(buf: Uint8Array) {
        let sz = 0
        for (let i = 0; i < buf.length; i += sz) {
            sz = buf[i]
            if (sz == 0)
                break
            const desig = getNumber(buf, NumberFormat.UInt32LE, i) >>> 8
            for (const key of Object.keys(uf2ExtTags)) {
                const tg = uf2ExtTags[key]
                if (desig == Math.abs(tg)) {
                    let v: any
                    if (tg < 0) {
                        v = bufferToString(buf.slice(i + 4, i + sz))
                    } else {
                        v = getNumber(buf, NumberFormat.UInt32LE, i + 4)
                    }
                    (currBlob as any)[key] = v
                    break
                }
            }
            sz = (sz + 3) & ~3
        }
    }
}

export function generateDeviceList(uf2: Uint8Array) {
    return parseUF2(uf2, "").map(b => `* \`\`0x${b.firmwareIdentifier.toString(16)}\`\` ${b.name}`).join("\n")
}

export interface FirmwareInfo {
    deviceId: string;
    version: string;
    name: string;
    firmwareIdentifier: number;
    blFirmwareIdentifier: number;
}

export async function parseFirmwareFile(blob: Blob, store?: string): Promise<FirmwareBlob[]> {
    const data = await readBlobToUint8Array(blob);
    const buf = new Uint8Array(data);
    const uf2Blobs = parseUF2(buf, store);
    return uf2Blobs;
}

async function scanCore(bus: JDBus, numTries: number, makeFlashers: boolean) {
    const devices: SMap<FirmwareInfo> = {}
    const flashers: FlashClient[] = []
    try {
        bus.on(PACKET_REPORT, handlePkt)
        for (let i = 0; i < numTries; ++i) {
            // ask all CTRL services for bootloader info
            if (!makeFlashers) {
                for (const reg of [
                    ControlReg.BootloaderFirmwareIdentifier,
                    ControlReg.FirmwareIdentifier,
                    ControlReg.FirmwareVersion,
                    ControlReg.DeviceDescription,
                ]) {
                    const pkt = Packet.onlyHeader(CMD_GET_REG | reg)
                    await pkt.sendAsMultiCommandAsync(bus, SRV_CTRL)
                    await delay(10)
                }
            }

            // also ask BL services if any
            const bl_announce = Packet.onlyHeader(CMD_ADVERTISEMENT_DATA)
            await bl_announce.sendAsMultiCommandAsync(bus, SRV_BOOTLOADER)

            await delay(10)
        }
    } finally {
        bus.off(PACKET_REPORT, handlePkt)
    }
    const devs = Object.values(devices).filter(d => {
        if (!d.blFirmwareIdentifier)
            d.blFirmwareIdentifier = d.firmwareIdentifier
        if (!d.firmwareIdentifier)
            d.firmwareIdentifier = d.blFirmwareIdentifier
        if (!d.firmwareIdentifier)
            return false
        return true
    })
    // store info in objects
    devs.forEach(info => {
        const dev = bus.device(info.deviceId)
        if (dev) dev.firmwareInfo = info
    })
    return {
        devs,
        flashers
    }

    function handlePkt(p: Packet) {
        let dev = devices[p.deviceIdentifier]
        if (!dev) {
            dev = devices[p.deviceIdentifier] = {
                deviceId: p.deviceIdentifier,
                firmwareIdentifier: null,
                version: null,
                name: null,
                blFirmwareIdentifier: null
            }
        }

        if (p.serviceIndex == 1 &&
            p.serviceCommand == CMD_ADVERTISEMENT_DATA &&
            p.getNumber(NumberFormat.UInt32LE, 0) == SRV_BOOTLOADER
        ) {
            dev.blFirmwareIdentifier = p.getNumber(NumberFormat.UInt32LE, 12)
            if (makeFlashers) {
                if (!flashers.find(f => f.device.deviceId == p.deviceIdentifier)) {
                    log(`new flasher`)
                    flashers.push(new FlashClient(bus, p))
                }
            }
        }

        if (!makeFlashers && p.serviceIndex == 0 && p.serviceCommand & CMD_GET_REG) {
            const reg = p.serviceCommand & CMD_REG_MASK
            if (reg == ControlReg.BootloaderFirmwareIdentifier)
                dev.blFirmwareIdentifier = p.uintData
            else if (reg == ControlReg.FirmwareIdentifier)
                dev.firmwareIdentifier = p.uintData
            else if (reg == ControlReg.DeviceDescription)
                dev.name = bufferToString(p.data)
            else if (reg == ControlReg.FirmwareVersion)
                dev.version = bufferToString(p.data)
        }
    }
}

export async function scanFirmwares(bus: JDBus, timeout = 300): Promise<FirmwareInfo[]> {
    const devs = (await scanCore(bus, (timeout / 50) >> 0, false)).devs
    devs.sort((a, b) => strcmp(a.deviceId, b.deviceId))
    return devs
}

export function updateApplicable(dev: FirmwareInfo, blob: FirmwareBlob) {
    return dev && blob && dev.blFirmwareIdentifier == blob.firmwareIdentifier && dev.version !== blob.version
}

export function computeUpdates(devices: FirmwareInfo[], blobs: FirmwareBlob[]) {
    return (blobs || []).map(blob => {
        const updateCandidates = devices.filter(d => updateApplicable(d, blob))
        if (updateCandidates.length == 0)
            return undefined
        return {
            blob,
            updateCandidates
        }
    }).filter(r => !!r)
}

export async function flashFirmwareBlob(bus: JDBus, blob: FirmwareBlob, updateCandidates: FirmwareInfo[], progress?: (perc: number) => void) {
    if (!updateCandidates?.length)
        return
    _startTime = Date.now()
    log(`resetting ${updateCandidates.length} device(s)`)
    for (const d of updateCandidates) {
        const device = bus.device(d.deviceId);
        log(`resetting ${device}`)
        await device.sendCtrlCommand(ControlCmd.Reset)
    }
    const flashers = (await scanCore(bus, 5, true)).flashers.filter(f => f.dev_class == blob.firmwareIdentifier)
    if (!flashers.length)
        throw new Error("no devices to flash")
    if (flashers.length != updateCandidates.length) {
        console.log(flashers, blob)
        throw new Error(`expected ${updateCandidates.length} flashers, got ${flashers.length}`)
    }
    flashers[0].classClients = flashers
    log(`flashing ${blob.name}`)
    await flashers[0].flashFirmwareBlob(blob, progress)
}
