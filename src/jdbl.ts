import * as U from "./pxtutils"
import * as HF2 from "./hf2"
import * as jd from "./jd"
import * as jdpretty from "./jdpretty"

const SERVCE_CLASS_BOOTLOADER = 0x1ffa9948

const BL_CMD_PAGE_DATA = 0x80
const BL_SUBPAGE_SIZE = 208

interface Program {
    deviceClass: number;
    flashStart: number;
    name: string;
    program: Uint8Array;
}

async function flashOneProgram(hf2: HF2.Proto, info: Program) {
    const startTime = Date.now()
    let targetDevice: jd.Device
    let currPageAddr = -1
    let currPageError = -1

    let pageSize = 0
    let flashSize = 0

    const binProgram = info.program

    function timestamp() {
        return Date.now() - startTime
    }

    function log(msg: string) {
        console.log(`BL [${timestamp()}ms]: ${msg}`)
    }

    log("flashing: " + info.name)

    hf2.onJDMessage(buf => {
        for (let p of jd.Packet.fromFrame(buf, timestamp())) {
            jd.process(p)
            if (!targetDevice &&
                p.is_report &&
                p.service_number == 1 &&
                p.service_command == jd.CMD_ADVERTISEMENT_DATA) {
                const d = U.decodeU32LE(p.data)
                if (d[0] == SERVCE_CLASS_BOOTLOADER) {
                    if (!info.deviceClass || d[3] == info.deviceClass) {
                        pageSize = d[1]
                        flashSize = d[2]
                        targetDevice = p.dev
                    }
                    return
                }
            }

            if (targetDevice && p.dev == targetDevice && p.is_report && p.service_number == 1) {
                if (p.service_command == BL_CMD_PAGE_DATA) {
                    currPageError = U.read32(p.data, 0)
                    currPageAddr = U.read32(p.data, 4)
                    return
                }
            }

            const pp = jdpretty.printPkt(p, {
                skipRepeatedAnnounce: true,
                skipRepeatedReading: true
            })
            if (pp)
                console.log(pp)
        }
    })

    log("resetting all devices")

    const rst = jd.Packet.onlyHeader(jd.CMD_CTRL_RESET)
    await rst.sendAsMultiCommandAsync(0)

    log("asking for bootloaders")

    const p = jd.Packet.onlyHeader(jd.CMD_ADVERTISEMENT_DATA)
    while (!targetDevice && timestamp() < 5000) {
        await p.sendAsMultiCommandAsync(SERVCE_CLASS_BOOTLOADER)
        await U.delay(100)
    }

    if (!targetDevice)
        throw "timeout waiting for devices"

    if (binProgram.length > flashSize)
        throw "program too big"

    log(`flashing ${targetDevice}; available flash=${flashSize / 1024}kb; page=${pageSize}b`)

    const hdSize = 7 * 4
    const numSubpage = ((pageSize + BL_SUBPAGE_SIZE - 1) / BL_SUBPAGE_SIZE) | 0

    for (let off = 0; off < binProgram.length; off += pageSize) {
        log(`flash ${off}/${binProgram.length}`)
        for (; ;) {
            let currSubpage = 0
            for (let suboff = 0; suboff < pageSize; suboff += BL_SUBPAGE_SIZE) {
                let sz = BL_SUBPAGE_SIZE
                if (suboff + sz > pageSize)
                    sz = pageSize - suboff
                const data = new Uint8Array(sz + hdSize)
                U.write32(data, 0, info.flashStart + off)
                U.write16(data, 4, suboff)
                data[6] = currSubpage++
                data[7] = numSubpage - 1
                data.set(binProgram.slice(off + suboff, off + suboff + sz), hdSize)
                const p = jd.Packet.from(BL_CMD_PAGE_DATA, data)
                p.service_number = 1
                await p.sendCmdAsync(targetDevice)
                await U.delay(5)
            }

            currPageError = -1
            for (let i = 0; i < 100; ++i) {
                if (currPageError >= 0)
                    break
                await U.delay(5)
            }
            if (currPageAddr != info.flashStart + off)
                currPageError = -2

            if (currPageError == 0) {
                break
            } else {
                log(`retry; err=${currPageError}`)
            }
        }
    }

    log("flash done; resetting target")

    const rst2 = jd.Packet.onlyHeader(jd.CMD_CTRL_RESET)
    await rst2.sendCmdAsync(targetDevice)

}

export interface Options {
    program: Uint8Array;
    name?: string;
    ignoreDevClass?: boolean;
}

export async function flash(hf2: HF2.Proto, opts: Options) {
    let binProgram = opts.program
    const name = opts.name
    console.log("flash: " + binProgram.length)
    while (binProgram.length) {
        const info: Program = {
            deviceClass: 0,
            flashStart: 0x0800_0000,
            name: name,
            program: binProgram
        }

        const hdsize = 16 * 4
        const header = U.decodeU32LE(binProgram.slice(0, hdsize))
        let endptr = binProgram.length

        if (header[0] == 0x4b50444a && header[1] == 0x1688f310) {
            const [_magic0, _magic1, pageSz, flashBase, progLen, devClass] = header
            info.deviceClass = devClass
            info.program = binProgram.slice(pageSz, pageSz + progLen)
            info.flashStart = flashBase
            for (let i = 0; i < 64; ++i) {
                if (binProgram[hdsize + i] == 0) {
                    info.name = name + ": " + U.bufferToString(binProgram.slice(hdsize, hdsize + i))
                    break
                }
            }
            endptr = (progLen + pageSz * 2 - 1) & ~(pageSz - 1)
        } else if ((header[0] & 0xff00_0000) == 0x2000_0000) {
            info.deviceClass = header[8]
        } else {
            throw "not a .bin or .jdpk file"
        }

        if (info.deviceClass && info.deviceClass >> 28 != 3)
            throw "device class invalid: " + info.deviceClass.toString(16)

        if (opts.ignoreDevClass)
            info.deviceClass = 0

        await flashOneProgram(hf2, info)

        binProgram = binProgram.slice(endptr)
    }

    await U.delay(300)
}
