export default interface TransportProxy {
    connect(deviceId?: string): Promise<void>
    send(payload: Uint8Array): Promise<void>
    disconnect(): Promise<void>
}
