import { getNumber, NumberFormat, setNumber } from "../jdom/buffer"
import { BitRadioCmd, BitRadioReg, SRV_BIT_RADIO } from "../jdom/constants"
import { inIFrame } from "../jdom/iframeclient"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"
import { memcpy, stringToBuffer } from "../jdom/utils"

// keep in sync with CODAL
const RADIO_MAX_PACKET_SIZE = 32
//const MAX_FIELD_DOUBLE_NAME_LENGTH = 8;
const MAX_PAYLOAD_LENGTH = 20
const PACKET_PREFIX_LENGTH = 9
const VALUE_PACKET_NAME_LEN_OFFSET = 13
const DOUBLE_VALUE_PACKET_NAME_LEN_OFFSET = 17

// Packet Spec:
// | 0              | 1 ... 4       | 5 ... 8           | 9 ... 28
// ----------------------------------------------------------------
// | packet type    | system time   | serial number     | payload
//
// Serial number defaults to 0 unless enabled by user

// payload: number (9 ... 12)
const PACKET_TYPE_NUMBER = 0
// payload: number (9 ... 12), name length (13), name (14 ... 26)
const PACKET_TYPE_VALUE = 1
// payload: string length (9), string (10 ... 28)
const PACKET_TYPE_STRING = 2
// payload: buffer length (9), buffer (10 ... 28)
const PACKET_TYPE_BUFFER = 3
// payload: number (9 ... 16)
const PACKET_TYPE_DOUBLE = 4
// payload: number (9 ... 16), name length (17), name (18 ... 26)
const PACKET_TYPE_DOUBLE_VALUE = 5

function getStringOffset(packetType: number) {
    switch (packetType) {
        case PACKET_TYPE_STRING:
            return PACKET_PREFIX_LENGTH
        case PACKET_TYPE_VALUE:
            return VALUE_PACKET_NAME_LEN_OFFSET
        case PACKET_TYPE_DOUBLE_VALUE:
            return DOUBLE_VALUE_PACKET_NAME_LEN_OFFSET
        default:
            return undefined
    }
}

/*
function getMaxStringLength(packetType: number) {
    switch (packetType) {
        case PACKET_TYPE_STRING:
            return MAX_PAYLOAD_LENGTH - 2;
        case PACKET_TYPE_VALUE:
        case PACKET_TYPE_DOUBLE_VALUE:
            return MAX_FIELD_DOUBLE_NAME_LENGTH;
        default:
            return undefined;
    }
}
*/

function truncateString(str: string) {
    // TODO
    return str
}

class RadioPacket {
    public static getPacket(data: Uint8Array) {
        if (!data) return undefined
        // last 4 bytes is RSSi
        return new RadioPacket(data)
    }

    public static mkPacket(packetType: number) {
        const res = new RadioPacket()
        res.data[0] = packetType
        return res
    }

    private constructor(public readonly data?: Uint8Array) {
        if (!data) this.data = new Uint8Array(RADIO_MAX_PACKET_SIZE + 4)
    }

    get signal() {
        return getNumber(this.data, NumberFormat.Int32LE, this.data.length - 4)
    }

    get packetType() {
        return this.data[0]
    }

    get time() {
        return getNumber(this.data, NumberFormat.Int32LE, 1)
    }

    set time(val: number) {
        setNumber(this.data, NumberFormat.Int32LE, 1, val)
    }

    get serial() {
        return getNumber(this.data, NumberFormat.Int32LE, 5)
    }

    set serial(val: number) {
        setNumber(this.data, NumberFormat.Int32LE, 5, val)
    }

    get stringPayload() {
        const offset = getStringOffset(this.packetType) as number
        return offset
            ? this.data.slice(offset + 1, this.data[offset]).toString()
            : undefined
    }

    set stringPayload(val: string) {
        const offset = getStringOffset(this.packetType) as number
        if (offset) {
            const buf = stringToBuffer(truncateString(val))
            this.data[offset] = buf.length
            memcpy(this.data, offset + 1, buf)
        }
    }

    get numberPayload() {
        switch (this.packetType) {
            case PACKET_TYPE_NUMBER:
            case PACKET_TYPE_VALUE:
                return getNumber(
                    this.data,
                    NumberFormat.Int32LE,
                    PACKET_PREFIX_LENGTH
                )
            case PACKET_TYPE_DOUBLE:
            case PACKET_TYPE_DOUBLE_VALUE:
                return getNumber(
                    this.data,
                    NumberFormat.Float64LE,
                    PACKET_PREFIX_LENGTH
                )
        }
        return undefined
    }

    set numberPayload(val: number) {
        switch (this.packetType) {
            case PACKET_TYPE_NUMBER:
            case PACKET_TYPE_VALUE:
                setNumber(
                    this.data,
                    NumberFormat.Int32LE,
                    PACKET_PREFIX_LENGTH,
                    val
                )
                break
            case PACKET_TYPE_DOUBLE:
            case PACKET_TYPE_DOUBLE_VALUE:
                setNumber(
                    this.data,
                    NumberFormat.Float64LE,
                    PACKET_PREFIX_LENGTH,
                    val
                )
                break
        }
    }

    get bufferPayload() {
        const len = this.data[PACKET_PREFIX_LENGTH]
        return this.data.slice(
            PACKET_PREFIX_LENGTH + 1,
            PACKET_PREFIX_LENGTH + 1 + len
        )
    }

    set bufferPayload(b: Uint8Array) {
        const len = Math.min(b.length, MAX_PAYLOAD_LENGTH - 1)
        this.data[PACKET_PREFIX_LENGTH] = len
        memcpy(this.data, PACKET_PREFIX_LENGTH + 1, b, 0, len)
    }

    hasString() {
        return (
            this.packetType === PACKET_TYPE_STRING ||
            this.packetType === PACKET_TYPE_VALUE ||
            this.packetType === PACKET_TYPE_DOUBLE_VALUE
        )
    }

    hasNumber() {
        return (
            this.packetType === PACKET_TYPE_NUMBER ||
            this.packetType === PACKET_TYPE_DOUBLE ||
            this.packetType === PACKET_TYPE_VALUE ||
            this.packetType === PACKET_TYPE_DOUBLE_VALUE
        )
    }
}

export default class BitRadioServer extends JDServiceServer {
    readonly enabled: JDRegisterServer<[number]>
    readonly group: JDRegisterServer<[number]>
    readonly transmissionPower: JDRegisterServer<[number]>
    readonly frequencyBand: JDRegisterServer<[number]>

    constructor() {
        super(SRV_BIT_RADIO)

        this.enabled = this.addRegister<[number]>(BitRadioReg.Enabled, [0])
        this.group = this.addRegister<[number]>(BitRadioReg.Group, [1])
        this.transmissionPower = this.addRegister<[number]>(
            BitRadioReg.TransmissionPower,
            [6]
        )
        this.frequencyBand = this.addRegister<[number]>(
            BitRadioReg.FrequencyBand,
            [7]
        )

        this.addCommand(
            BitRadioCmd.SendString,
            this.handleSendString.bind(this)
        )
        this.addCommand(
            BitRadioCmd.SendNumber,
            this.handleSendNumber.bind(this)
        )
        this.addCommand(BitRadioCmd.SendValue, this.handleSendValue.bind(this))
        this.addCommand(
            BitRadioCmd.SendBuffer,
            this.handleSendBuffer.bind(this)
        )
    }

    private handleSendString(pkt: Packet) {
        const [message] = pkt.jdunpack<[string]>("s")
        const rpkt = RadioPacket.mkPacket(PACKET_TYPE_STRING)
        rpkt.stringPayload = message
        this.sendRadioPacket(rpkt)
    }

    private handleSendNumber(pkt: Packet) {
        const [value] = pkt.jdunpack<[number, string]>("f64")
        const rpkt = RadioPacket.mkPacket(PACKET_TYPE_DOUBLE)
        rpkt.numberPayload = value
        this.sendRadioPacket(rpkt)
    }

    private handleSendValue(pkt: Packet) {
        const [value, name] = pkt.jdunpack<[number, string]>("f64 s")
        const rpkt = RadioPacket.mkPacket(PACKET_TYPE_DOUBLE_VALUE)
        rpkt.stringPayload = name
        rpkt.numberPayload = value
        this.sendRadioPacket(rpkt)
    }

    private handleSendBuffer(pkt: Packet) {
        const { data } = pkt
        const rpkt = RadioPacket.mkPacket(PACKET_TYPE_BUFFER)
        rpkt.bufferPayload = data
        this.sendRadioPacket(rpkt)
    }

    private sendRadioPacket(rpkt: RadioPacket) {
        const [on] = this.enabled.values()
        if (!on) return // radio is off

        const { bus } = this.device
        const { timestamp } = bus
        const [group] = this.group.values()
        rpkt.time = timestamp
        rpkt.serial = 0 // todo
        const msg = {
            type: "radiopacket",
            broadcast: true,
            // TODO
            rssi: -75,
            // TODO
            serial: 0,
            time: bus.timestamp,
            payload: {
                groupId: group,
                type: 0, // buffer
                bufferData: rpkt.data,
            },
        }
        // send message to parent
        console.log(`bitradio: send`, msg)
        if (inIFrame()) {
            window.parent.postMessage(msg, "*")
        }
    }
}
