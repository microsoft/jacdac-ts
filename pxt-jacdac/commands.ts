namespace jacdac {
    // Registers 0x001-0x07f - r/w common to all services
    // Registers 0x080-0x0ff - r/w defined per-service
    // Registers 0x100-0x17f - r/o common to all services
    // Registers 0x180-0x1ff - r/o defined per-service
    // Registers 0x200-0xeff - custom, defined per-service
    // Registers 0xf00-0xfff - reserved for implementation, should not be on the wire

    export const CMD_GET_REG = 0x1000
    export const CMD_SET_REG = 0x2000
    export const CMD_TYPE_MASK = 0xf000
    export const CMD_REG_MASK = 0x0fff

    export const CMD_EVENT_MASK = 0x8000
    export const CMD_EVENT_CODE_MASK = 0xff
    export const CMD_EVENT_COUNTER_MASK = 0x7f
    export const CMD_EVENT_COUNTER_POS = 8
}
