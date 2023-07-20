import { bufferToArray, NumberFormat, getNumber } from "./buffer"
import { JDBus } from "./bus"
import { Packet } from "./packet"
import { JDDevice } from "./device"
import {
    BootloaderCmd,
    ControlCmd,
    SRV_BOOTLOADER,
    CMD_ADVERTISEMENT_DATA,
    PACKET_REPORT,
    PROGRESS,
    CHANGE,
} from "./constants"
import {
    assert,
    bufferConcat,
    bufferToString,
    readBlobToUint8Array,
} from "./utils"
import { jdpack, jdunpack } from "./pack"
import { BootloaderError } from "./constants"
import { prettySize } from "./pretty"
import { Flags } from "./flags"
import { dualDeviceId, isDualDeviceId } from "./spec"
import { JDEventSource } from "./eventsource"

const BL_SUBPAGE_SIZE = 208
const BL_RETRIES = 15
const BL_SESSION_DELAY = 5
const BL_PAGE_DELAY = 5

let _startTime = 0

const uf2ExtTags: Record<string, number> = {
    version: -0x9fc7bc,
    name: -0x650d9d,
    pageSize: 0x0be9f7,
    productIdentifier: 0xc8a729,
}

/**
 * UF2 page data structure
 * @category Firmware
 * @internal
 */
export interface FirmwarePage {
    data: Uint8Array
    targetAddress: number
}

/**
 * Data structure representing a firmware binary
 * @category Firmware
 * @internal
 */
export interface FirmwareBlob {
    pages: FirmwarePage[]
    productIdentifier: number
    pageSize: number
    name: string
    version: string
    // name of the file or repo
    store: string
}

function timestamp() {
    if (!_startTime) _startTime = Date.now()
    return Date.now() - _startTime
}

function log(msg: string) {
    if (Flags.diagnostics) console.debug(`BL [${timestamp()}ms]: ${msg}`)
}

export class FirmwareUpdater extends JDEventSource {
    constructor(
        readonly bus: JDBus,
        readonly blob: FirmwareBlob,
    ) {
        super()
    }

    /**
     * Flash firmware blob onto device
     * @param bus
     * @param blob
     * @param updateCandidates
     * @param ignoreFirmwareCheck
     * @param progress
     * @returns
     * @category Firmware
     */
    async flash(
        updateCandidates: FirmwareInfo[],
        ignoreFirmwareCheck: boolean,
    ) {
        if (!updateCandidates?.length) return
        const { bus, blob } = this
        _startTime = Date.now()
        log(`resetting ${updateCandidates.length} device(s)`)
        const bootloaderDeviceIds: string[] = []
        for (const d of updateCandidates) {
            const device = bus.device(d.deviceId, true)
            if (!device) {
                log("device not found")
                return
            }
            if (!device.bootloader) {
                log(`resetting ${device}`)
                bootloaderDeviceIds.push(dualDeviceId(device.deviceId))
                await device.sendCtrlCommand(ControlCmd.Reset)
            } else {
                bootloaderDeviceIds.push(device.deviceId)
            }
        }
        const allFlashers = await createFlashers(this, bootloaderDeviceIds)
        const flashers = allFlashers
            .filter(
                f =>
                    !!ignoreFirmwareCheck ||
                    f.dev_class == blob.productIdentifier,
            )
            .filter(f =>
                updateCandidates.find(
                    uc =>
                        uc.deviceId === f.device.deviceId ||
                        isDualDeviceId(uc.deviceId, f.device.deviceId),
                ),
            )
        if (!flashers.length) {
            log(`no devices to flash`)
            return
        }
        if (flashers.length != updateCandidates.length) {
            console.error(
                `expected ${updateCandidates.length} flashers, got ${flashers.length}`,
            )
            return
        }
        log(`flashing ${blob.name}`)
        flashers[0].classClients = flashers
        const unmounts: (() => void)[] = []
        try {
            flashers.forEach(f => {
                f.device.firmwareUpdater = this
                const dualDevice = bus.device(
                    dualDeviceId(f.device.deviceId),
                    true,
                )
                if (dualDevice) dualDevice.firmwareUpdater = this
                unmounts.push(() => {
                    f.device.firmwareUpdater = undefined
                    if (dualDevice) dualDevice.firmwareUpdater = undefined
                })
            })
            await flashers[0].flashFirmwareBlob(blob)
        } finally {
            unmounts.forEach(u => u())
        }
    }
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

    private progressTotal: number
    private progressIndex: number

    constructor(
        readonly updater: FirmwareUpdater,
        adpkt: Packet,
    ) {
        const d = bufferToArray(adpkt.data, NumberFormat.UInt32LE)
        this.pageSize = d[1]
        this.flashSize = d[2]
        this.dev_class = d[3]
        this.device = adpkt.device
        this.handlePacket = this.handlePacket.bind(this)
    }

    get bus() {
        return this.updater.bus
    }

    get progress() {
        return this.progressTotal ? this.progressIndex / this.progressTotal : 0
    }

    private handlePacket(pkt: Packet) {
        if (pkt.serviceCommand == BootloaderCmd.PageData) this.lastStatus = pkt
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
        for (const d of this.classClients) {
            d.start()
            log(
                `flashing ${d.device.shortId}; available flash=${
                    d.flashSize / 1024
                }kb; page=${d.pageSize}b`,
            )
        }

        const setsession = Packet.jdpacked<[number]>(
            BootloaderCmd.SetSession,
            "u32",
            [this.sessionId],
        )

        this.allPending()

        for (let i = 0; i < BL_RETRIES; ++i) {
            for (const d of this.classClients) {
                if (d.pending) {
                    if (
                        d.lastStatus &&
                        d.lastStatus.getNumber(NumberFormat.UInt32LE, 0) ==
                            this.sessionId
                    ) {
                        d.pending = false
                    } else {
                        d.lastStatus = null
                        log(`set session ${this.sessionId} on ${d.device}`)
                        await d.sendCommandAsync(setsession)
                    }
                    await this.bus.delay(BL_SESSION_DELAY)
                }
            }
            if (this.numPending() == 0) break
            await this.waitForStatusAsync()
        }

        if (this.numPending()) throw new Error("Can't set session id")
    }

    private async endFlashAsync() {
        for (const f of this.classClients) {
            await this.bus.delay(10)
            await f.device.reset()
        }
    }

    private allPending() {
        for (const c of this.classClients) {
            c.pending = true
            c.lastStatus = null
        }
    }

    private numPending() {
        let num = 0
        for (const c of this.classClients) if (c.pending) num++
        return num
    }

    private async waitForStatusAsync() {
        for (let i = 0; i < 100; ++i) {
            if (this.classClients.every(c => c.lastStatus != null)) break
            await this.bus.delay(5)
        }
    }

    private async flashPage(page: FirmwarePage) {
        const pageAddr = page.targetAddress
        const pageSize = this.pageSize
        const numSubpage =
            ((pageSize + BL_SUBPAGE_SIZE - 1) / BL_SUBPAGE_SIZE) | 0

        log(
            `flash ${prettySize(this.pageSize)} at ${(
                pageAddr & 0xffffff
            ).toString(16)}`,
        )

        if (page.data.length != this.pageSize)
            throw new Error("invalid page size")

        for (const f of this.classClients) f.lastStatus = null

        this.allPending()
        for (let i = 0; i < BL_RETRIES; ++i) {
            log(`  attempt ${i}`)
            let currSubpage = 0
            for (let suboff = 0; suboff < pageSize; suboff += BL_SUBPAGE_SIZE) {
                let sz = BL_SUBPAGE_SIZE
                if (suboff + sz > pageSize) sz = pageSize - suboff
                log(
                    `send sub page ${currSubpage}/${
                        numSubpage - 1
                    } at ${suboff.toString(16)}[${sz}]`,
                )
                const hd = jdpack("u32 u16 u8 u8 u32 u32 u32 u32 u32", [
                    pageAddr,
                    suboff,
                    currSubpage++,
                    numSubpage - 1,
                    this.sessionId,
                    0,
                    0,
                    0,
                    0,
                ])
                assert(hd.length == 4 * 7)
                const p = Packet.from(
                    BootloaderCmd.PageData,
                    bufferConcat(hd, page.data.slice(suboff, suboff + sz)),
                )
                // in first round, just broadcast everything
                // in other rounds, broadcast everything except for last packet
                if (
                    this.classClients.length > 1 &&
                    (i == 0 || currSubpage < numSubpage)
                )
                    await p.sendAsMultiCommandAsync(this.bus, SRV_BOOTLOADER)
                else {
                    for (const f of this.classClients)
                        if (f.pending) {
                            f.lastStatus = null
                            await f.sendCommandAsync(p)
                        }
                }
                await this.bus.delay(BL_PAGE_DELAY)
            }

            await this.waitForStatusAsync()

            for (const f of this.classClients) {
                if (f.pending) {
                    let err = ""
                    if (f.lastStatus) {
                        const [session_id, page_error, pageAddrR] = jdunpack<
                            [number, BootloaderError, number]
                        >(f.lastStatus.data, "u32 u32 u32")
                        if (session_id != this.sessionId)
                            err = "invalid session_id"
                        else if (pageAddrR != pageAddr)
                            err = "invalid page address"
                        else if (page_error)
                            err =
                                "err: " +
                                (BootloaderError[page_error] || page_error)
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

            if (this.numPending() == 0) {
                log(
                    `page ${
                        pageAddr & 0xffffff
                    } done, ${i}/${BL_RETRIES} retries`,
                )
                return
            }
        }

        throw new Error("too many retries")
    }

    public async flashFirmwareBlob(fw: FirmwareBlob) {
        const waitCycles = 15
        this.progressTotal = fw.pages.length + waitCycles + 3
        this.progressIndex = 0
        const prog = () => {
            this.updater.emit(PROGRESS, this.progress)
            this.progressIndex++
        }
        try {
            this.updater.emit(CHANGE)
            prog()
            await this.startFlashAsync()
            prog()
            for (const page of fw.pages) {
                await this.flashPage(page)
                prog()
            }
        } finally {
            try {
                // even if something failed, try to reset everyone
                await this.endFlashAsync()
                prog()
                // wait until we're out of bootloader mode; otherwise the subsequent scan will keep devices in BL mode
                for (let i = 0; i < waitCycles; ++i) {
                    await this.bus.delay(150)
                    prog()
                }
            } finally {
                // even if resetting failed, unregister event listeners
                for (const d of this.classClients) {
                    d.stop()
                }
            }
            this.updater.emit(CHANGE)
        }
    }
}

const UF2_MAGIC_START0 = 0x0a324655
const UF2_MAGIC_START1 = 0x9e5d5157
const UF2_MAGIC_END = 0x0ab16f30

/**
 * Parses a UF2 firmware binary into firmware blobs
 * @param uf2
 * @param store
 * @returns
 * @category Firmware
 */
export function parseUF2Firmware(
    uf2: Uint8Array,
    store: string,
): FirmwareBlob[] {
    const blobs: FirmwareBlob[] = []
    let currBlob: FirmwareBlob
    for (let off = 0; off < uf2.length; off += 512) {
        const header = uf2.slice(off, off + 32)
        const [
            magic0,
            magic1,
            flags,
            trgaddr,
            payloadSize,
            blkNo,
            numBlocks,
            familyID,
        ] = bufferToArray(header, NumberFormat.UInt32LE)
        if (
            magic0 != UF2_MAGIC_START0 ||
            magic1 != UF2_MAGIC_START1 ||
            getNumber(uf2, NumberFormat.UInt32LE, off + 512 - 4) !=
                UF2_MAGIC_END
        )
            throw new Error("invalid UF2")
        if (blkNo == 0) {
            flush()
            currBlob = {
                pages: [],
                productIdentifier: familyID,
                version: "",
                pageSize: 1024,
                name: "FW " + familyID.toString(16),
                store,
            }
        }
        if (flags & 0x8000)
            parseExtTags(uf2.slice(off + 32 + payloadSize, off + 512))
        const pageSize = currBlob.pageSize || 1024
        let currPage = currBlob.pages[currBlob.pages.length - 1]
        if (
            !currPage ||
            !(
                currPage.targetAddress <= trgaddr &&
                trgaddr < currPage.targetAddress + pageSize
            )
        ) {
            currPage = {
                targetAddress: trgaddr & ~(pageSize - 1),
                data: new Uint8Array(pageSize),
            }
            currPage.data.fill(0xff)
            currBlob.pages.push(currPage)
        }
        currPage.data.set(
            uf2.slice(off + 32, off + 32 + payloadSize),
            trgaddr - currPage.targetAddress,
        )
    }
    flush()
    return blobs

    function flush() {
        if (currBlob) blobs.push(currBlob)
    }

    function parseExtTags(buf: Uint8Array) {
        let sz = 0
        for (let i = 0; i < buf.length; i += sz) {
            sz = buf[i]
            if (sz == 0) break
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
                    const cbany = currBlob as any
                    cbany[key] = v
                    break
                }
            }
            sz = (sz + 3) & ~3
        }
    }
}

/**
 * Firmware information
 * @internal
 */
export interface FirmwareInfo {
    deviceId: string
    version: string
    name: string
    productIdentifier: number
    bootloaderProductIdentifier: number
}

/**
 * Parse a UF2 firmware file and extracts firmware blobs
 * @param blob
 * @param store
 * @returns
 * @category Firmware
 */
export async function parseFirmwareFile(
    blob: Blob,
    store?: string,
): Promise<FirmwareBlob[]> {
    const data = await readBlobToUint8Array(blob)
    const buf = new Uint8Array(data)
    const uf2Blobs = parseUF2Firmware(buf, store)
    return uf2Blobs
}

async function createFlashers(
    updater: FirmwareUpdater,
    bootloaderDeviceIds?: string[],
) {
    const bus = updater.bus
    const flashers: FlashClient[] = []
    const numTries = 10
    const tryDelay = 10

    const handlePkt = (p: Packet) => {
        // note that we may get this even if recovery==false due to someone else asking
        // (eg when the user set the recovery mode toggle)
        if (
            p.serviceIndex == 1 &&
            p.serviceCommand == CMD_ADVERTISEMENT_DATA &&
            p.getNumber(NumberFormat.UInt32LE, 0) == SRV_BOOTLOADER
        ) {
            if (!flashers.find(f => f.device.deviceId == p.deviceIdentifier)) {
                log(`new flasher`)
                flashers.push(new FlashClient(updater, p))
            }
        }
    }

    try {
        bus.on(PACKET_REPORT, handlePkt)
        for (let i = 0; i < numTries; ++i) {
            if (bootloaderDeviceIds?.length > 1) {
                // also ask BL services if any
                const bl_announce = Packet.onlyHeader(CMD_ADVERTISEMENT_DATA)
                await bl_announce.sendAsMultiCommandAsync(bus, SRV_BOOTLOADER)
                await bus.delay(tryDelay)
            } else {
                for (const id of bootloaderDeviceIds) {
                    const bl_announce = Packet.onlyHeader(
                        CMD_ADVERTISEMENT_DATA,
                    )
                    bl_announce.serviceIndex = 1
                    bl_announce.deviceIdentifier = id
                    bl_announce.isCommand = true
                    await bus.sendPacketAsync(bl_announce)
                }
            }
            await bus.delay(tryDelay)
        }
    } finally {
        bus.off(PACKET_REPORT, handlePkt)
    }
    return flashers
}

/**
 * Indicates if a firmware blob is applicated to the device information
 * @param dev
 * @param blob
 * @returns
 * @category Firmware
 */
export function updateApplicable(dev: FirmwareInfo, blob: FirmwareBlob) {
    return (
        dev &&
        blob &&
        dev.bootloaderProductIdentifier == blob.productIdentifier &&
        dev.version !== blob.version
    )
}

/**
 * This command can be sent every 50ms to keep devices in bootloader mode
 * @param bus
 * @category Firmware
 */
export async function sendStayInBootloaderCommand(bus: JDBus) {
    const bl_announce = Packet.onlyHeader(BootloaderCmd.Info)
    await bl_announce.sendAsMultiCommandAsync(bus, SRV_BOOTLOADER)
}
