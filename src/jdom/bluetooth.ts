import Packet from "./packet"
import Flags from "./flags"
import { bufferConcat } from "./utils"
import {
    BLUETOOTH_JACDAC_TX_CHARACTERISTIC,
    BLUETOOTH_JACDAC_RX_CHARACTERISTIC,
    BLUETOOTH_JACDAC_DIAG_CHARACTERISTIC,
    BLUETOOTH_JACDAC_SERVICE,
    BLUETOOTH_TRANSPORT,
} from "./constants"
import { JDTransport } from "./transport"

export function isWebBluetoothEnabled(): boolean {
    return !!Flags.webBluetooth
}

export function isWebBluetoothSupported(): boolean {
    try {
        return (
            typeof navigator !== "undefined" &&
            !!navigator.bluetooth &&
            !!navigator.bluetooth.requestDevice
        )
    } catch (e) {
        return false
    }
}

function bleRequestDevice(
    options?: RequestDeviceOptions
): Promise<BluetoothDevice> {
    // disabled
    if (!Flags.webUSB) return Promise.resolve(undefined)

    try {
        return navigator?.bluetooth?.requestDevice(options)
    } catch (e) {
        if (Flags.diagnostics) console.warn(e)
        return undefined
    }
}

function bleGetDevices(): Promise<BluetoothDevice[]> {
    // disabled
    if (!Flags.webBluetooth) return Promise.resolve([])

    try {
        return navigator?.bluetooth?.getDevices() || Promise.resolve([])
    } catch (e) {
        if (Flags.diagnostics) console.warn(e)
        return Promise.resolve([])
    }
}

class BluetoothTransport extends JDTransport {
    private _device: BluetoothDevice
    private _server: BluetoothRemoteGATTServer
    private _service: BluetoothRemoteGATTService
    private _rxCharacteristic: BluetoothRemoteGATTCharacteristic
    private _txCharacteristic: BluetoothRemoteGATTCharacteristic
    private _rxBuffer: Uint8Array
    private _rxTotalSize: number

    constructor() {
        super(BLUETOOTH_TRANSPORT)

        this.handleDisconnected = this.handleDisconnected.bind(this)
        this.handleCharacteristicChanged = this.handleCharacteristicChanged.bind(
            this
        )
    }

    protected async transportConnectAsync(background: boolean) {
        // get a device
        if (background) {
            const devices = await bleGetDevices()
            this._device = devices?.[0]
        } else {
            const device = await bleRequestDevice({
                filters: [{namePrefix:"BBC micro:bit"}],
                optionalServices:[BLUETOOTH_JACDAC_SERVICE]
            })
            this._device = device
        }

        if (!this._device?.gatt) throw new Error("Device not found")

        // listen for disconnection
        this._device.addEventListener(
            "gattserverdisconnected",
            this.handleDisconnected,
            false
        )

        // connect to gatt
        this._server = await this._device.gatt.connect()
        // connect to service
        this._service = await this._server.getPrimaryService(
            BLUETOOTH_JACDAC_SERVICE
        )
        // connect to characteristic
        this._rxCharacteristic = await this._service.getCharacteristic(
            BLUETOOTH_JACDAC_RX_CHARACTERISTIC
        )

        this._txCharacteristic = await this._service.getCharacteristic(
            BLUETOOTH_JACDAC_TX_CHARACTERISTIC
        )
        // listen for incoming packet
        this._rxCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.handleCharacteristicChanged,
            false
        )
        // start listening
        await this._rxCharacteristic.startNotifications()
    }

    protected async transportSendPacketAsync(p: Packet) {
        if (!this._txCharacteristic) {
            console.debug(`trying to send Bluetooth packet while disconnected`)
            return
        }

        const data = p.toBuffer()

        const length = data.length;

        let sent = 0;
        while(sent < length) {
            let n = Math.min(20, length - sent)
            this._txCharacteristic.writeValueWithoutResponse(data.slice(sent, sent + n))
            sent += n
        }
        
        console.log(`send: ${p}`);
        
    }

    protected async transportDisconnectAsync() {
        if (!this._device) return

        console.debug(`ble: disconnecting`)
        try {
            this._rxCharacteristic?.removeEventListener(
                "characteristicvaluechanged",
                this.handleCharacteristicChanged
            )
            this._device?.removeEventListener(
                "gattserverdisconnected",
                this.handleDisconnected
            )
            this._server.disconnect()
        } finally {
            this._rxCharacteristic = undefined
            this._txCharacteristic = undefined
            this._service = undefined
            this._server = undefined
            this._device = undefined
            this._rxBuffer = undefined;
        }
    }

    private handleDisconnected() {
        // start disconnecting
        this.disconnect()
    }

    private handleCharacteristicChanged() {
        const data = new Uint8Array(this._rxCharacteristic.value.buffer)
        console.log(`received length ${data.length}`)
        if (!this._rxBuffer)
        {
            this._rxBuffer = data
            const frame_len = data[2] || 0
            this._rxTotalSize = frame_len + 12;
            console.log(`first dp ${this._rxTotalSize}` )
        }
        else
        {
            console.log(`notf dp rx buffer length ${this._rxBuffer.length}, expected size ${this._rxTotalSize}`)
            this._rxBuffer = bufferConcat(this._rxBuffer, data);
        }

        if (this._rxBuffer.length >= this._rxTotalSize)
        {
            const pkt = Packet.fromBinary(this._rxBuffer, this.bus.timestamp)
            pkt.sender = BLUETOOTH_TRANSPORT
            this.bus.processPacket(pkt)
            this._rxBuffer = undefined;
            this._rxTotalSize = 0;
        }
    }
}

export function createBluetoothTransport(): JDTransport {
    return new BluetoothTransport()
}
