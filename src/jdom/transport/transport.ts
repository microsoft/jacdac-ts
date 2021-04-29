import { JDBus } from "../bus"
import {
    CHANGE,
    CONNECT,
    CONNECTING,
    CONNECTION_STATE,
    DISCONNECT,
    DISCONNECTING,
    ERROR,
    PACKET_SEND_DISCONNECT,
} from "../constants"
import { JDEventSource } from "../eventsource"
import Packet from "../packet"

export enum ConnectionState {
    Connected = "connected",
    Connecting = "connecting",
    Disconnecting = "disconnecting",
    Disconnected = "disconnected",
}

/**
 * A transport marshalls Jacdac packets between a physical device on the TypeScript bus.
 */
export abstract class JDTransport extends JDEventSource {
    public bus: JDBus
    protected disposed = false

    constructor(readonly type: string) {
        super()
    }

    private _connectionState = ConnectionState.Disconnected
    private _connectPromise: Promise<void>
    private _disconnectPromise: Promise<void>

    /**
     * Gets the bus connection state.
     */
    get connectionState(): ConnectionState {
        return this._connectionState
    }

    private setConnectionState(state: ConnectionState) {
        if (this._connectionState !== state) {
            console.debug(`${this._connectionState} -> ${state}`)
            this._connectionState = state
            this.emit(CONNECTION_STATE, this._connectionState)
            switch (this._connectionState) {
                case ConnectionState.Connected:
                    this.emit(CONNECT)
                    break
                case ConnectionState.Connecting:
                    this.emit(CONNECTING)
                    break
                case ConnectionState.Disconnecting:
                    this.emit(DISCONNECTING)
                    break
                case ConnectionState.Disconnected:
                    this.emit(DISCONNECT)
                    break
            }
            this.emit(CHANGE)
            this.bus.emit(CHANGE)
        }
    }

    get connecting() {
        return this.connectionState == ConnectionState.Connecting
    }

    get disconnecting() {
        return this.connectionState == ConnectionState.Disconnecting
    }

    get connected() {
        return this._connectionState == ConnectionState.Connected
    }

    get disconnected() {
        return this._connectionState == ConnectionState.Disconnected
    }

    protected abstract transportSendPacketAsync(p: Packet): Promise<void>
    protected abstract transportConnectAsync(
        background?: boolean
    ): Promise<void>
    protected abstract transportDisconnectAsync(): Promise<void>

    async sendPacketAsync(p: Packet) {
        if (!this.connected) {
            this.emit(PACKET_SEND_DISCONNECT, p)
        } else {
            await this.transportSendPacketAsync(p)
        }
    }

    connect(background?: boolean): Promise<void> {
        console.debug(`connection ${this.type}`)
        if (this.disposed)
            throw new Error("attempted to connect to a disposed transport")
        // already connected
        if (this.connectionState == ConnectionState.Connected) {
            console.debug(`already connected`)
            return Promise.resolve()
        }

        // connecting
        if (!this._connectPromise) {
            // already disconnecting, retry when disconnected
            if (this._disconnectPromise) {
                console.debug(`queuing connect after disconnecting`)
                const p = this._disconnectPromise
                this._disconnectPromise = undefined
                this._connectPromise = p.then(() => this.connect())
            } else {
                // starting a fresh connection
                console.debug(`connecting`)
                this._connectPromise = Promise.resolve()
                this.setConnectionState(ConnectionState.Connecting)
                this._connectPromise = this._connectPromise.then(() =>
                    this.transportConnectAsync(background)
                )
                const p = (this._connectPromise = this._connectPromise
                    .then(() => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined
                            this.setConnectionState(ConnectionState.Connected)
                        } else {
                            console.debug(`connection aborted in flight`, {
                                state: this._connectionState,
                                old: this._connectPromise,
                                new: p,
                            })
                            if (!background)
                                this.errorHandler(
                                    CONNECT,
                                    new Error("connection aborted in flight")
                                )
                        }
                    })
                    .catch(e => {
                        if (p == this._connectPromise) {
                            this._connectPromise = undefined
                            this.setConnectionState(
                                ConnectionState.Disconnected
                            )
                            if (!background) this.errorHandler(CONNECT, e)
                            else console.debug("background connect failed")
                        } else {
                            console.debug(`connection error aborted in flight`)
                        }
                    }))
            }
        } else {
            console.debug(`connect with existing promise`)
        }
        return this._connectPromise
    }

    disconnect(): Promise<void> {
        // already disconnected
        if (this.connectionState == ConnectionState.Disconnected)
            return Promise.resolve()

        if (!this._disconnectPromise) {
            // connection in progress, wait and disconnect when done
            if (this._connectPromise) {
                console.debug(`cancelling connection and disconnect`)
                this._connectPromise = undefined
            }
            console.debug(`disconnecting`)
            this._disconnectPromise = Promise.resolve()
            this.setConnectionState(ConnectionState.Disconnecting)
            this._disconnectPromise = this._disconnectPromise.then(() =>
                this.transportDisconnectAsync()
            )
            this._disconnectPromise = this._disconnectPromise
                .catch(e => {
                    this._disconnectPromise = undefined
                    this.errorHandler(DISCONNECT, e)
                })
                .finally(() => {
                    this._disconnectPromise = undefined
                    this.setConnectionState(ConnectionState.Disconnected)
                })
        } else {
            console.debug(`disconnect with existing promise`)
        }
        return this._disconnectPromise
    }

    protected handlePacket(payload: Uint8Array) {
        const pkt = Packet.fromBinary(payload, this.bus.timestamp)
        pkt.sender = this.type
        this.bus.processPacket(pkt)
    }

    protected handleFrame(payload: Uint8Array) {
        const pkts = Packet.fromFrame(payload, this.bus.timestamp)
        for (const pkt of pkts) {
            pkt.sender = this.type
            this.bus.processPacket(pkt)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected errorHandler(context: string, exception: any) {
        const wasConnected = this.connected
        console.error(
            `error ${context} ${exception?.message}\n${exception?.stack}`
        )
        this.emit(ERROR, { context, exception })
        this.emit(CHANGE)

        this.disconnect()
            // retry connect
            .then(() => wasConnected && this.connect(true))
    }

    dispose() {
        this.disposed = true
    }
}
