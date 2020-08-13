
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

export const CMD_CONSOLE_REG = 0x80
export const CMD_CONSOLE_MESSAGE_DBG = 0x80
export const CMD_CONSOLE_SET_MIN_PRIORITY = 0x2000 | CMD_CONSOLE_REG

export const PIPE_PORT_SHIFT = 7
export const PIPE_COUNTER_MASK = 0x001f
export const PIPE_CLOSE_MASK = 0x0020
export const PIPE_METADATA_MASK = 0x0040

export const JD_SERIAL_HEADER_SIZE = 16
export const JD_SERIAL_MAX_PAYLOAD_SIZE = 236
export const JD_SERVICE_NUMBER_MASK = 0x3f
export const JD_SERVICE_NUMBER_INV_MASK = 0xc0
export const JD_SERVICE_NUMBER_CRC_ACK = 0x3f
export const JD_SERVICE_NUMBER_PIPE = 0x3e
export const JD_SERVICE_NUMBER_CTRL = 0x00

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

export enum ConsolePriority {
    Debug = 0,
    Log = 1,
    Warning = 2,
    Error = 3,
    Silent = 4
}

/** known service numbers */
export const SRV_CTRL = 0;
export const SRV_LOGGER = 0x12dc1fca;
export const SRV_BATTERY = 0x1d2a2acd;
export const SRV_ACCELEROMETER = 0x1f140409;
export const SRV_BUTTON = 0x1473a263;
export const SRV_TOUCHBUTTON = 0x130cf5be;
export const SRV_LIGHT_SENSOR = 0x15e7a0ff;
export const SRV_MICROPHONE = 0x1a5c5866;
export const SRV_THERMOMETER = 0x1421bac7;
export const SRV_SWITCH = 0x14218172;
export const SRV_PIXEL = 0x1768fbbf;
export const SRV_HAPTIC = 0x116b14a3;
export const SRV_LIGHT = 0x126f00e0;
export const SRV_KEYBOARD = 0x1ae4812d;
export const SRV_MOUSE = 0x14bc97bf;
export const SRV_GAMEPAD = 0x100527e8;
export const SRV_MUSIC = 0x1b57b1d7;
export const SRV_SERVO = 0x12fc9103;
export const SRV_CONTROLLER = 0x188ae4b8;
export const SRV_LCD = 0x18d5284c;
export const SRV_MESSAGE_BUS = 0x115cabf5;
export const SRV_COLOR_SENSOR = 0x14d6dda2;
export const SRV_LIGHT_SPECTRUM_SENSOR = 0x16fa0c0d;
export const SRV_PROXIMITY = 0x14c1791b;
export const SRV_TOUCH_BUTTONS = 0x1acb49d5;
export const SRV_SERVOS = 0x182988d8;
export const SRV_ROTARY_ENCODER = 0x10fa29c9;
export const SRV_DNS = 0x117729bd;
export const SRV_PWM_LIGHT = 0x1fb57453;
export const SRV_BOOTLOADER = 0x1ffa9948;
export const SRV_ARCADE_CONTROLS = 0x1deaa06e;
export const SRV_POWER = 0x1fa4c95a;
export const SRV_SLIDER = 0x1f274746;
export const SRV_MOTOR = 0x17004cd8;
export const SRV_TCP = 0x1b43b70b;
export const SRV_WIFI = 0x18aae1fa;
export const SRV_MULTITOUCH = 0x18d55e2b;

export const NEW_LISTENER = 'newListener'
export const REMOVE_LISTENER = 'removeListener'

export const CONNECTION_STATE = 'connectionState'
export const CONNECT = 'connect';
export const CONNECTING = 'connecting';
export const DISCONNECT = 'disconnect';
export const DISCONNECTING = 'disconnecting'
export const ANNOUNCE = 'announce'
export const RESTART = 'restart'
export const CHANGE = 'change'
export const EVENT = 'event'
export const FIRMWARE_INFO = 'firmwareInfo'
export const FIRMWARE_BLOBS_CHANGE = 'firmwareBlobsChange'

export const DEVICE_CONNECT = 'deviceConnect'
export const DEVICE_DISCONNECT = 'deviceDisconnect'
export const DEVICE_ANNOUNCE = 'deviceAnnounce'
export const DEVICE_RESTART = 'deviceRestart'
export const DEVICE_CHANGE = 'deviceChange'
export const DEVICE_FIRMWARE_INFO = 'firmwareInfo'

export const PACKET_SEND = 'packetSend'

export const PACKET_PROCESS = 'packetProcess'
export const PACKET_RECEIVE = 'packetReceive'
export const PACKET_RECEIVE_ANNOUNCE = 'packetReceiveAnnounce'
export const PACKET_EVENT = 'packetEvent'
export const PACKET_REPORT = 'packetReport'

export const REPORT_RECEIVE = 'reportReceive'
export const REPORT_UPDATE = 'reportUpdate'

export const ERROR = 'error'

export const PACKET_KIND_RW = "rw"
export const PACKET_KIND_RO = "ro"
export const PACKET_KIND_EVENT = "event"

export const REGISTER_NODE_NAME = "register"
export const EVENT_NODE_NAME = "event"
export const SERVICE_NODE_NAME = "service"
export const DEVICE_NODE_NAME = "device"
export const BUS_NODE_NAME = "bus"
export const COMMAND_NODE_NAME = "command"
export const FIELD_NODE_NAME = "field"

export * from "../../jacdac-spec/dist/specconstants";
