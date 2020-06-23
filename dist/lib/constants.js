"use strict";
// Registers 0x001-0x07f - r/w common to all services
// Registers 0x080-0x0ff - r/w defined per-service
// Registers 0x100-0x17f - r/o common to all services
// Registers 0x180-0x1ff - r/o defined per-service
// Registers 0x200-0xeff - custom, defined per-service
// Registers 0xf00-0xfff - reserved for implementation, should not be on the wire
Object.defineProperty(exports, "__esModule", { value: true });
exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = exports.JD_FRAME_FLAG_ACK_REQUESTED = exports.JD_FRAME_FLAG_COMMAND = exports.JD_SERVICE_NUMBER_CTRL = exports.JD_SERVICE_NUMBER_STREAM = exports.JD_SERVICE_NUMBER_CRC_ACK = exports.JD_SERVICE_NUMBER_INV_MASK = exports.JD_SERVICE_NUMBER_MASK = exports.JD_SERIAL_MAX_PAYLOAD_SIZE = exports.JD_SERIAL_HEADER_SIZE = exports.STREAM_METADATA_MASK = exports.STREAM_CLOSE_MASK = exports.STREAM_COUNTER_MASK = exports.STREAM_PORT_SHIFT = exports.CMD_CTRL_RESET = exports.CMD_CTRL_IDENTIFY = exports.CMD_CTRL_NOOP = exports.CMD_GET_DESCRIPTION = exports.CMD_CALIBRATE = exports.CMD_EVENT = exports.CMD_ADVERTISEMENT_DATA = exports.CMD_REG_MASK = exports.CMD_TOP_MASK = exports.CMD_SET_REG = exports.CMD_GET_REG = exports.REG_READING = exports.REG_MAX_POWER = exports.REG_HIGH_THRESHOLD = exports.REG_LOW_THRESHOLD = exports.REG_STREAMING_INTERVAL = exports.REG_IS_STREAMING = exports.REG_VALUE = exports.REG_INTENSITY = void 0;
// this is either binary (0 or non-zero), or can be gradual (eg. brightness of neopixel)
exports.REG_INTENSITY = 0x01;
// the primary value of actuator (eg. servo angle)
exports.REG_VALUE = 0x02;
// enable/disable streaming
exports.REG_IS_STREAMING = 0x03;
// streaming interval in miliseconds
exports.REG_STREAMING_INTERVAL = 0x04;
// for analog sensors
exports.REG_LOW_THRESHOLD = 0x05;
exports.REG_HIGH_THRESHOLD = 0x06;
// limit power drawn; in mA
exports.REG_MAX_POWER = 0x07;
// eg. one number for light sensor, all 3 coordinates for accelerometer
exports.REG_READING = 0x101;
exports.CMD_GET_REG = 0x1000;
exports.CMD_SET_REG = 0x2000;
exports.CMD_TOP_MASK = 0xf000;
exports.CMD_REG_MASK = 0x0fff;
// Commands 0x000-0x07f - common to all services
// Commands 0x080-0xeff - defined per-service
// Commands 0xf00-0xfff - reserved for implementation
// enumeration data for CTRL, ad-data for other services
exports.CMD_ADVERTISEMENT_DATA = 0x00;
// event from sensor or on broadcast service
exports.CMD_EVENT = 0x01;
// request to calibrate sensor
exports.CMD_CALIBRATE = 0x02;
// request human-readable description of service
exports.CMD_GET_DESCRIPTION = 0x03;
// Commands specific to control service
// do nothing
exports.CMD_CTRL_NOOP = 0x80;
// blink led or otherwise draw user's attention
exports.CMD_CTRL_IDENTIFY = 0x81;
// reset device
exports.CMD_CTRL_RESET = 0x82;
exports.STREAM_PORT_SHIFT = 7;
exports.STREAM_COUNTER_MASK = 0x001f;
exports.STREAM_CLOSE_MASK = 0x0020;
exports.STREAM_METADATA_MASK = 0x0040;
exports.JD_SERIAL_HEADER_SIZE = 16;
exports.JD_SERIAL_MAX_PAYLOAD_SIZE = 236;
exports.JD_SERVICE_NUMBER_MASK = 0x3f;
exports.JD_SERVICE_NUMBER_INV_MASK = 0xc0;
exports.JD_SERVICE_NUMBER_CRC_ACK = 0x3f;
exports.JD_SERVICE_NUMBER_STREAM = 0x3e;
exports.JD_SERVICE_NUMBER_CTRL = 0x00;
// the COMMAND flag signifies that the device_identifier is the recipent
// (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
// (i.e., it's a report from peripheral or a broadcast message)
exports.JD_FRAME_FLAG_COMMAND = 0x01;
// an ACK should be issued with CRC of this package upon reception
exports.JD_FRAME_FLAG_ACK_REQUESTED = 0x02;
// the device_identifier contains target service class number
exports.JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04;
//# sourceMappingURL=constants.js.map