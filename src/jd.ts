import { Packet } from "./jdpacket"
import { getDevice } from "./jddevice"
import { bufferEq } from "./jdutils"

// Registers 0x001-0x07f - r/w common to all services
// Registers 0x080-0x0ff - r/w defined per-service
// Registers 0x100-0x17f - r/o common to all services
// Registers 0x180-0x1ff - r/o defined per-service
// Registers 0x200-0xeff - custom, defined per-service
// Registers 0xf00-0xfff - reserved for implementation, should not be on the wire

// this is either binary (0 or non-zero), or can be gradual (eg. brightness of neopixel)
export const REG_INTENSITY = 0x01
// the primary value of actuator (eg. servo angle)
export const REG_VALUE = 0x02
// enable/disable streaming
export const REG_IS_STREAMING = 0x03
// streaming interval in miliseconds
export const REG_STREAMING_INTERVAL = 0x04
// for analog sensors
export const REG_LOW_THRESHOLD = 0x05
export const REG_HIGH_THRESHOLD = 0x06
// limit power drawn; in mA
export const REG_MAX_POWER = 0x07

// eg. one number for light sensor, all 3 coordinates for accelerometer
export const REG_READING = 0x101

export const CMD_GET_REG = 0x1000
export const CMD_SET_REG = 0x2000

export const CMD_TOP_MASK = 0xf000
export const CMD_REG_MASK = 0x0fff


// Commands 0x000-0x07f - common to all services
// Commands 0x080-0xeff - defined per-service
// Commands 0xf00-0xfff - reserved for implementation
// enumeration data for CTRL, ad-data for other services
export const CMD_ADVERTISEMENT_DATA = 0x00
// event from sensor or on broadcast service
export const CMD_EVENT = 0x01
// request to calibrate sensor
export const CMD_CALIBRATE = 0x02
// request human-readable description of service
export const CMD_GET_DESCRIPTION = 0x03

// Commands specific to control service
// do nothing
export const CMD_CTRL_NOOP = 0x80
// blink led or otherwise draw user's attention
export const CMD_CTRL_IDENTIFY = 0x81
// reset device
export const CMD_CTRL_RESET = 0x82

export const STREAM_PORT_SHIFT = 7
export const STREAM_COUNTER_MASK = 0x001f
export const STREAM_CLOSE_MASK = 0x0020
export const STREAM_METADATA_MASK = 0x0040

export const JD_SERIAL_HEADER_SIZE = 16
export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236
export const JD_SERVICE_NUMBER_MASK = 0x3f
export const JD_SERVICE_NUMBER_INV_MASK = 0xc0
export const JD_SERVICE_NUMBER_CRC_ACK = 0x3f
export const JD_SERVICE_NUMBER_STREAM = 0x3e
export const JD_SERVICE_NUMBER_CTRL = 0x00

// the COMMAND flag signifies that the device_identifier is the recipent
// (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
// (i.e., it's a report from peripheral or a broadcast message)
export const JD_FRAME_FLAG_COMMAND = 0x01
// an ACK should be issued with CRC of this package upon reception
export const JD_FRAME_FLAG_ACK_REQUESTED = 0x02
// the device_identifier contains target service class number
export const JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04

let sendPacketFn = (p: Packet) => Promise.resolve(undefined)

/**
 * Register transport layer function that sends packet.
 * @param f transport function sending packet.
 */
export function setSendPacketFn(f: (p: Packet) => Promise<void>) {
    sendPacketFn = f
}

/**
 * Sends a packet over the bus
 * @param p 
 */
export function sendPacketAsync(p: Packet): Promise<void> {
    return sendPacketFn(p);
}

/**
 * Ingests and process a packet received from the bus.
 * @param pkt a jacdac packet
 */
export function processPacket(pkt: Packet) {
    if (pkt.multicommand_class) {
        //
    } else if (pkt.is_command) {
        pkt.dev = getDevice(pkt.device_identifier)
    } else {
        const dev = pkt.dev = getDevice(pkt.device_identifier)
        dev.lastSeen = pkt.timestamp

        if (pkt.service_number == JD_SERVICE_NUMBER_CTRL) {
            if (pkt.service_command == CMD_ADVERTISEMENT_DATA) {
                if (!bufferEq(pkt.data, dev.services)) {
                    dev.services = pkt.data
                    dev.lastServiceUpdate = pkt.timestamp
                    // reattach(dev)
                }
            }
        }
    }
}
