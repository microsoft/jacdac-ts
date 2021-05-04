export interface TransportMessage {
    type: "connect" | "disconnect" | "send" | "packet" | "frame"
    id?: string
    error?: {
        message?: string
    }
}

export interface TransportPacketMessage extends TransportMessage {
    type: "packet" | "frame"
    payload: Uint8Array
}

export interface TransportConnectMessage extends TransportMessage {
    type: "connect"
    deviceId?: string
    background?: boolean
}