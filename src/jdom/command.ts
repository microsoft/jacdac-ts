import { setNumber, sizeOfNumberFormat } from "./buffer"
import { CMD_SET_REG, JD_SERIAL_MAX_PAYLOAD_SIZE } from "./constants"
import Packet from "./packet"
import { clampToStorage, isRegister, numberFormatFromStorageType, scaleFloatToInt } from "./spec"
import { stringToUint8Array, toUTF8 } from "./utils"

export type ArgType = number | boolean | string | Uint8Array
export function packArguments(info: jdspec.PacketInfo, args: ArgType[]) {
    let repeatIdx = -1
    let numReps = 0
    const argIdx = 0
    let dst = 0

    const buf = new Uint8Array(256)

    for (let i = 0; i < info.fields.length; ++i) {
        if (argIdx >= args.length && numReps > 0)
            break
        const arg0 = argIdx < args.length ? args[argIdx] : 0
        const fld = info.fields[i]

        if (repeatIdx == -1 && fld.startRepeats)
            repeatIdx = i

        const arg = typeof arg0 == "boolean" ? (arg0 ? 1 : 0)
            : typeof arg0 == "string" ? stringToUint8Array(toUTF8(arg0)) : arg0

        if (typeof arg == "number") {
            const intVal = scaleFloatToInt(arg, fld)
            if (fld.storage == 0)
                throw new Error(`expecting ${fld.type} got number`)

            const fmt = numberFormatFromStorageType(fld.storage)
            setNumber(buf, fmt, dst, clampToStorage(intVal, fld.storage))
            dst += sizeOfNumberFormat(fmt)
        } else {
            if (fld.storage == 0 || Math.abs(fld.storage) == arg.length) {
                buf.set(arg, dst)
                dst += arg.length
            } else {
                throw new Error(`expecting ${Math.abs(fld.storage)} bytes; got ${arg.length}`)
            }
        }

        if (dst >= JD_SERIAL_MAX_PAYLOAD_SIZE)
            throw new Error(`jacdac packet length too large, ${dst} > ${JD_SERIAL_MAX_PAYLOAD_SIZE} bytes`)

        if (repeatIdx != -1 && i + 1 >= info.fields.length) {
            i = repeatIdx - 1
            numReps++
        }
    }

    const cmd = isRegister(info) ? info.identifier | CMD_SET_REG : info.identifier
    const pkt = Packet.from(cmd, buf.slice(0, dst))
    if (info.kind != "report")
        pkt.isCommand = true
    return pkt
}