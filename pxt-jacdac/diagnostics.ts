namespace jacdac {
    /**
     * Gets the internal diagnostics data from the Jacdac transport layer
     */
    export function diagnostics(): jacdac.JDDiagnostics {
        return new jacdac.JDDiagnostics(jacdac.__physGetDiagnostics())
    }

    export class JDDiagnostics {
        busState: number
        busLoError: number
        busUartError: number
        busTimeoutError: number
        packetsSent: number
        packetsReceived: number
        packetsDropped: number

        constructor(buf: Buffer) {
            if (!buf) return
            ;[
                this.busState,
                this.busLoError,
                this.busUartError,
                this.busTimeoutError,
                this.packetsSent,
                this.packetsReceived,
                this.packetsDropped,
            ] = jdunpack<number[]>(buf, "u32 u32 u32 u32 u32 u32 u32")
        }
    }
}
