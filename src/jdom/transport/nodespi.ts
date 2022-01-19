import { Packet } from "../packet"
import { toHex } from "../utils"
import { Transport,  TransportOptions } from "./transport"

export interface SpiTransportOptions extends TransportOptions {
    txReadyPin: number
    rxReadyPin: number
    resetPin: number
    spiBusId: number
}

const XFER_SIZE = 256
const SPI_TRANSFER_ATTEMPT_COUNT = 10

interface Rpio {
    INPUT: number
    OUTPUT: number
    PULL_DOWN: number
    HIGH: number
    LOW: number
    POLL_HIGH: number
    open(pin: number, mode: number, flags?: number): void
    close(pin: number): void
    write(pin: number, value: number): void
    read(pin: number): number
    mode(pin: number, mode: number, flags?: number): void
    poll(pin: number, cb: () => void, direction?: number): void

    spiBegin(): void
    spiChipSelect(chip: number): void
    spiSetDataMode(mode: number): void
    spiSetCSPolarity(a: number, b: number): void
    spiSetClockDivider(ck: number): void
    spiTransfer(tx: Uint8Array, rx: Uint8Array, length: number): void
    spiEnd(): void
}

/**
 * A SPI bridge using https://www.npmjs.com/package/rpio
 */
class SpiTransport extends Transport {
    readonly sendQueue: Uint8Array[] = []
    readonly receiveQueue: Packet[] = []

    constructor(
        readonly controller: Rpio,
        readonly options: SpiTransportOptions
    ) {
        super("spi", options)
        this.handleRxPinRising = this.handleRxPinRising.bind(this)
        this.handleTxPinRising = this.handleTxPinRising.bind(this)
    }

    protected async transportConnectAsync(background?: boolean): Promise<void> {
        try {
            return this.internalTransportConnectAsync()
        } catch (e) {
            console.error("SPI configuration failed: make sure to install rpio")
            this.disconnectRpio();
            throw e
        }
    }

    private async internalTransportConnectAsync(): Promise<void> {
        console.log("connecting to jacdapter...")

        const { txReadyPin, rxReadyPin, resetPin } = this.options
        const { HIGH, LOW, POLL_HIGH, PULL_DOWN, INPUT, OUTPUT } =
            this.controller

        this.controller.open(txReadyPin, INPUT, PULL_DOWN) // pull down
        this.controller.open(rxReadyPin, INPUT, PULL_DOWN) // pull down

        this.controller.open(resetPin, OUTPUT)
        this.controller.write(resetPin, LOW)
        await this.bus.delay(10)
        this.controller.write(resetPin, HIGH)

        this.controller.mode(resetPin, INPUT)

        this.controller.spiBegin()
        this.controller.spiChipSelect(0) /* Use CE0 */
        this.controller.spiSetCSPolarity(
            0,
            HIGH
        ) /* AT93C46 chip select is active-high */
        this.controller.spiSetClockDivider(
            128
        ) /* AT93C46 max is 2MHz, 128 == 1.95MHz */
        this.controller.spiSetDataMode(0)

        this.controller.poll(rxReadyPin, this.handleRxPinRising, POLL_HIGH)
        this.controller.poll(txReadyPin, this.handleTxPinRising, POLL_HIGH)

        console.log("jacdapter ready")

        await this.transfer()
    }

    protected async transportDisconnectAsync(
        background?: boolean
    ): Promise<void> {
        this.disconnectRpio()
    }

    private disconnectRpio() {
        try {
            const { txReadyPin, rxReadyPin, resetPin } = this.options

            this.controller.close(txReadyPin)
            this.controller.close(rxReadyPin)
            this.controller.close(resetPin)

            this.controller.spiEnd()
        } catch(e) {
            console.debug(e)
        }
    }

    private handleRxPinRising() {
        //Console.WriteLine($"rx rise");
        this.transfer()
    }

    private handleTxPinRising() {
        //Console.WriteLine($"tx rise");
        this.transfer()
    }

    protected async transportSendPacketAsync(p: Packet): Promise<void> {
        this.sendQueue.push(p.toBuffer())
        this.transfer()
    }

    private async transfer() {
        let todo = true
        while (todo) {
            todo = await this.transferFrame()
            while (this.receiveQueue.length > 0) {
                const pkt = this.receiveQueue.shift()
                this.bus.processPacket(pkt)
            }
        }
    }

    private async transferFrame(): Promise<boolean> {
        const now = this.bus.timestamp
        // much be in a locked context
        const { txReadyPin, rxReadyPin } = this.options
        const { HIGH } = this.controller
        const txReady = this.controller.read(txReadyPin) == HIGH
        const rxReady = this.controller.read(rxReadyPin) == HIGH
        const sendtx = this.sendQueue.length > 0 && txReady

        if (!sendtx && !rxReady) return false

        // allocate transfer buffers
        const txqueue = new Uint8Array(XFER_SIZE)
        const rxqueue = new Uint8Array(txqueue.length)

        // assemble packets into send buffer
        let txq_ptr = 0
        while (
            this.sendQueue.length > 0 &&
            txq_ptr + this.sendQueue[0].length < XFER_SIZE
        ) {
            const pkt = this.sendQueue.shift()
            txqueue.set(pkt, txq_ptr)
            txq_ptr += (pkt.length + 3) & ~3
        }

        // attempt transfer
        const ok: boolean = await this.attemptTransferBuffers(txqueue, rxqueue)
        if (!ok) {
            console.log("transfer failed")
            return false
        }

        if (rxReady) {
            // consume received frame if any
            let framep = 0
            while (framep < XFER_SIZE) {
                const frame2 = rxqueue[framep + 2]
                /*
                if (framep == 0 && frame2 > 0)
                {
                    Console.WriteLine($"tx {txReady}, rx {rxReady}, send {this.sendQueue.Count}, recv {this.receiveQueue.Count}");
                    Console.WriteLine($"rx {HexEncoding.ToString(rxqueue)}");
                }
                */
                if (frame2 == 0) break
                let sz = frame2 + 12
                if (framep + sz > XFER_SIZE) {
                    console.log(
                        `packet overflow ${framep} + ${sz} > ${XFER_SIZE}`
                    )
                    break
                }
                const frame0 = rxqueue[framep]
                const frame1 = rxqueue[framep + 1]
                const frame3 = rxqueue[framep + 3]

                if (frame0 == 0xff && frame1 == 0xff && frame3 == 0xff) {
                    // skip bogus packet
                } else {
                    const frame = rxqueue.slice(framep, framep + sz)
                    console.log(`recv frame ${toHex(frame)}`)
                    this.receiveQueue.push(...Packet.fromFrame(frame, now))
                }
                sz = (sz + 3) & ~3
                framep += sz
            }
        }
        return true
    }

    private async attemptTransferBuffers(
        txqueue: Uint8Array,
        rxqueue: Uint8Array
    ) {
        // attempt transfer
        for (let i = 0; i < SPI_TRANSFER_ATTEMPT_COUNT; i++) {
            try {
                this.controller.spiTransfer(txqueue, rxqueue, txqueue.length)
                return true
            } catch (ex) {
                console.log(ex)
                await this.bus.delay(1)
            }
        }
        return false
    }
}

const RPI_PIN_TX_READY = 24
const RPI_PIN_RX_READY = 25
const RPI_PIN_RST = 22
const RPI_SPI_BUS_ID = 0

/**
 * A transport for a JacHAT type of adapter.
 * Requires to install the `rpio` package.
 * @param options
 * @returns
 */
export function createNodeSPITransport(
    controller: Rpio,
    options?: SpiTransportOptions
): Transport {
    if (!options) {
        options = {
            txReadyPin: RPI_PIN_TX_READY,
            rxReadyPin: RPI_PIN_RX_READY,
            resetPin: RPI_PIN_RST,
            spiBusId: RPI_SPI_BUS_ID,
        }
    }
    return new SpiTransport(controller, options)
}
