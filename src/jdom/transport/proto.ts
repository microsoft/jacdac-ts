export default interface Proto {
    onJDMessage(f: (buf: Uint8Array) => void): void
    sendJDMessageAsync(buf: Uint8Array): Promise<void>
    postConnectAsync(): Promise<void>
    disconnectAsync(): Promise<void>
}
