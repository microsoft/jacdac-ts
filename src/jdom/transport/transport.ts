import { JDBus } from "../bus"
import {
    CHANGE,
    CONNECT,
    CONNECTING,
    CONNECTION_STATE,
    DISCONNECT,
    DISCONNECTING,
    ERROR,
    LOST,
    PACKET_SEND_DISCONNECT,
    SELF_ANNOUNCE,
    TRANSPORT_CONNECT_RETRY_DELAY,
    TRANSPORT_PULSE_TIMEOUT,
} from "../constants"
import { JDEventSource } from "../eventsource"
import { Observable } from "../observable"
import Packet from "../packet"
import { assert, delay } from "../utils"

export enum ConnectionState {
    Connected = "connected",
    Connecting = "connecting",
    Disconnecting = "disconnecting",
    Disconnected = "disconnected",
}

export interface JDTransportOptions {
    // if no packets is received within the pulse interval, disconnect/reconnect
    checkPulse?: boolean
    connectObservable?: Observable<void>
    disconnectObservable?: Observable<void>
}

/**
 * A transport marshalls Jacdac packets between a physical device on the TypeScript bus.
 */
export abstract class JDTransport extends JDEventSource {
    private _bus: JDBus
    private _checkPulse: boolean
    private _lastReceivedTime: number
    protected disposed = false
    private _cleanups: (() => void)[]

    constructor(readonly type: string, options?: JDTransportOptions) {
        super()
        this._checkPulse = !!options?.checkPulse
        this._cleanups = [
            options?.connectObservable?.subscribe({
                next: async () => {
                    if (this.bus?.disconnected) {
                        await delay(TRANSPORT_CONNECT_RETRY_DELAY)
                        if (this.bus?.disconnected) this.connect(true)
                    }
                },
            })?.unsubscribe,
            options?.disconnectObservable?.subscribe({
                next: () => {
                    this.disconnect()
                },
            })?.unsubscribe,
        ].filter(c => !!c)
    }

    get bus() {
        return this._bus
    }

    set bus(bus: JDBus) {
        assert(!this._bus && !!bus)
        this._bus = bus
        if (this._checkPulse) {
            this._bus.on(SELF_ANNOUNCE, this.checkPulse.bind(this))
        }
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
            this._lastReceivedTime =
                state === ConnectionState.Connected
                    ? this._bus.timestamp
                    : undefined
            this._connectionState = state
            this.emit(CONNECTION_STATE, this._connectionState)
            this.bus.emit(CONNECTION_STATE)
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
    protected abstract transportDisconnectAsync(background?: boolean): Promise<void>

    private async checkPulse() {
        assert(this._checkPulse)
        if (!this.connected) return // ignore while connected
        if (this.bus.safeBoot) return // don't mess with flashing bootloaders
        const devices = this.bus.devices()
        if (devices.some(dev => dev.flashing)) // don't mess with flashing
            return

        // detect if the proxy device is lost
        const t = this.bus.timestamp - this._lastReceivedTime
        if (t > TRANSPORT_PULSE_TIMEOUT) {
            this.emit(LOST)
            await this.reconnect()
        }
    }

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

    disconnect(background?: boolean): Promise<void> {
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
                this.transportDisconnectAsync(background)
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

    async reconnect() {
        await this.disconnect(true)
        await this.connect(true)
    }

    protected handlePacket(payload: Uint8Array) {
        const { timestamp } = this.bus
        this._lastReceivedTime = timestamp
        const pkt = Packet.fromBinary(payload, timestamp)
        pkt.sender = this.type
        this.bus.processPacket(pkt)
    }

    protected handleFrame(payload: Uint8Array) {
        const { timestamp } = this.bus
        this._lastReceivedTime = timestamp
        const pkts = Packet.fromFrame(payload, timestamp)
        for (const pkt of pkts) {
            pkt.sender = this.type
            this.bus.processPacket(pkt)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected errorHandler(context: string, exception: any) {
        const wasConnected = this.connected
        this.emit(ERROR, { context, exception })
        this.bus.emit(ERROR, { transport: this, context, exception })
        this.emit(CHANGE)

        this.disconnect(true)
            // retry connect
            .then(() => wasConnected && this.connect(true))
    }

    dispose() {
        this.disposed = true
        this._cleanups.forEach(c => c())
        this._cleanups = []
    }
}
