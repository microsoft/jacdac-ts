export default interface TransportProxy {
    connect(): Promise<void>
    send(payload: Uint8Array): Promise<void>
    disconnect(): Promise<void>
}
