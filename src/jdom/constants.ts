
// Registers 0x001-0x07f - r/w common to all services
// Registers 0x080-0x0ff - r/w defined per-service
// Registers 0x100-0x17f - r/o common to all services
// Registers 0x180-0x1ff - r/o defined per-service
// Registers 0x200-0xeff - custom, defined per-service
// Registers 0xf00-0xfff - reserved for implementation, should not be on the wire

export const CMD_GET_REG = 0x1000
export const CMD_SET_REG = 0x2000

export const CMD_TOP_MASK = 0xf000
export const CMD_REG_MASK = 0x0fff

export const ACK_MIN_DELAY = 90
export const ACK_MAX_DELAY = 120

export const CMD_EVENT_MASK = 0x8000
export const CMD_EVENT_CODE_MASK = 0xff
export const CMD_EVENT_COUNTER_MASK = 0x7f
export const CMD_EVENT_COUNTER_POS = 8

// Commands 0x000-0x07f - common to all services
// Commands 0x080-0xeff - defined per-service
// Commands 0xf00-0xfff - reserved for implementation
// enumeration data for CTRL, ad-data for other services
export const CMD_ADVERTISEMENT_DATA = 0x00
// event from sensor or on broadcast service
export const CMD_EVENT = 0x01

export const PIPE_PORT_SHIFT = 7
export const PIPE_COUNTER_MASK = 0x001f
export const PIPE_CLOSE_MASK = 0x0020
export const PIPE_METADATA_MASK = 0x0040

export const JD_SERIAL_HEADER_SIZE = 16
export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236
export const JD_SERVICE_INDEX_MASK = 0x3f
export const JD_SERVICE_INDEX_INV_MASK = 0xc0
export const JD_SERVICE_INDEX_CRC_ACK = 0x3f
export const JD_SERVICE_INDEX_PIPE = 0x3e
export const JD_SERVICE_INDEX_CTRL = 0x00

// the COMMAND flag signifies that the device_identifier is the recipent
// (i.e., it's a command for the peripheral); the bit clear means device_identifier is the source
// (i.e., it's a report from peripheral or a broadcast message)
export const JD_FRAME_FLAG_COMMAND = 0x01
// an ACK should be issued with CRC of this package upon reception
export const JD_FRAME_FLAG_ACK_REQUESTED = 0x02
// the device_identifier contains target service class number
export const JD_FRAME_FLAG_IDENTIFIER_IS_SERVICE_CLASS = 0x04

export const JD_ADVERTISEMENT_0_COUNTER_MASK = 0x0000000F
export const JD_ADVERTISEMENT_0_ACK_SUPPORTED = 0x00000100

// time withouth seeing a package to be considered "lost", 2x announce interval
export const JD_DEVICE_LOST_DELAY = 1500
// time without seeing a packet to be considered "disconnected"
export const JD_DEVICE_DISCONNECTED_DELAY = 5000

export const SRV_CTRL = 0;

export const NEW_LISTENER = 'newListener'
export const REMOVE_LISTENER = 'removeListener'

export const CONNECTION_STATE = 'connectionState'
export const CONNECT = 'connect';
export const LOST = 'lost'
export const FOUND = 'found'
export const CONNECTING = 'connecting';
export const DISCONNECT = 'disconnect';
export const DISCONNECTING = 'disconnecting'
export const ANNOUNCE = 'announce'
export const START = 'start'
export const RESTART = 'restart'
export const STOP = 'stop'
export const CHANGE = 'change'
export const EVENT = 'event'
export const RENDER = 'render'
export const REFRESH = 'refresh'
export const FIRMWARE_INFO = 'firmwareInfo'
export const FIRMWARE_BLOBS_CHANGE = 'firmwareBlobsChange'
export const NAME_CHANGE = 'nameChange'
export const LATE = 'late'
export const GET_ATTEMPT = 'getAttempt'
export const SERVICE_CLIENT_ADDED = `serviceClientAdded`
export const SERVICE_CLIENT_REMOVED = `serviceClientRemoved`
export const READING_SENT = 'readingSent'

export const DEVICE_HOST_ADDED = `deviceHostAdded`
export const DEVICE_HOST_REMOVED = `deviceHostRemoved`

export const IDENTIFY = "identify"
export const IDENTIFY_DURATION = 2000
export const RESET = "reset"

export const DATA = 'data'
export const CLOSE = 'close'

export const DEVICE_CONNECT = 'deviceConnect'
export const DEVICE_LOST = 'deviceLost'
export const DEVICE_FOUND = 'deviceFound'
export const DEVICE_DISCONNECT = 'deviceDisconnect'
export const DEVICE_ANNOUNCE = 'deviceAnnounce'
export const DEVICE_RESTART = 'deviceRestart'
export const DEVICE_CHANGE = 'deviceChange'
export const DEVICE_FIRMWARE_INFO = 'firmwareInfo'
export const DEVICE_NAME_CHANGE = 'deviceNameChange'
export const SELF_ANNOUNCE = 'selfAnnounce'

export const PACKET_SEND = 'packetSend'
export const PACKET_SEND_DISCONNECT = 'packetSendDisconnect'

export const PACKET_PRE_PROCESS = 'packetPreProcess'
export const PACKET_PROCESS = 'packetProcess'
export const PACKET_RECEIVE = 'packetReceive'
export const PACKET_RECEIVE_ANNOUNCE = 'packetReceiveAnnounce'
export const PACKET_EVENT = 'packetEvent'
export const PACKET_REPORT = 'packetReport'
export const PACKET_ANNOUCE = 'packetAnnounce'

export const REPORT_RECEIVE = 'reportReceive'
export const REPORT_UPDATE = 'reportUpdate'

export const ERROR = 'error'
export const TIMEOUT = 'timeout'
export const TIMEOUT_DISCONNECT = 'timeoutDisconnect'

export const PROGRESS = 'progress'

export const PACKET_KIND_RW = "rw"
export const PACKET_KIND_RO = "ro"
export const PACKET_KIND_EVENT = "event"
export const PACKET_KIND_ANNOUNCE = "announce"

export const REGISTER_NODE_NAME = "register"
export const REPORT_NODE_NAME = "report"
export const CONST_NODE_NAME = "const"
export const EVENT_NODE_NAME = "event"
export const SERVICE_NODE_NAME = "service"
export const DEVICE_NODE_NAME = "device"
export const VIRTUAL_DEVICE_NODE_NAME = "virtualdevice"
export const BUS_NODE_NAME = "bus"
export const COMMAND_NODE_NAME = "command"
export const FIELD_NODE_NAME = "field"
export const PIPE_NODE_NAME = "pipe"
export const PIPE_REPORT_NODE_NAME = "pipe_report"
export const CRC_ACK_NODE_NAME = "crc_ack"

export const REGISTER_REFRESH_TIMEOUT = 150
export const REGISTER_REFRESH_RETRY_0 = 30
export const REGISTER_REFRESH_RETRY_1 = 80
export const REGISTER_POLL_FIRST_REPORT_INTERVAL = 400
export const REGISTER_POLL_REPORT_INTERVAL = 5001
export const REGISTER_POLL_REPORT_MAX_INTERVAL = 60000
export const REGISTER_OPTIONAL_POLL_COUNT = 3
export const STREAMING_DEFAULT_INTERVAL = 50

export const USB_TRANSPORT = "usb"
export const PACKETIO_TRANSPORT = "packetio"

export const META_ACK = "ACK"
export const META_ACK_FAILED = "ACK_FAILED"
export const META_PIPE = "PIPE"
export const META_GET = "GET"

export const TRACE_FILTER_HORIZON = 100

export * from "../../jacdac-spec/dist/specconstants";
