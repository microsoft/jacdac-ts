export interface TransportMessage {
    jacdac: true
    type: "connect" | "disconnect" | "send" | "packet" | "frame" | "error"
    id?: string
    background?: boolean
    error?: {
        message?: string
        stack?: string
        name?: string
        jacdacName?: string
    }
}

export interface TransportPacketMessage extends TransportMessage {
    type: "packet" | "frame"
    payload: Uint8Array
}

export interface TransportConnectMessage extends TransportMessage {
    type: "connect"
    deviceId?: string
}
