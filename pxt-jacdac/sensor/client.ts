namespace jacdac {
    //% fixedInstances
    //% weight=1
    export class SensorClient extends Client {
        protected readonly _reading: RegisterClient<PackSimpleDataType[]>

        public isStreaming = false

        constructor(deviceClass: number, role: string, stateFormat: string) {
            super(deviceClass, role);
            this._reading = this.addRegister(jacdac.SystemReg.Reading, stateFormat)
        }

        announceCallback() {
            if (this.isStreaming)
                this.setReg(jacdac.SystemReg.StreamingSamples, "u8", [this.isStreaming ? 255 : 0])
        }

        /**
         * Enables or disable streaming the sensor internal state
         * @param on streaming enabled
         */
        public setStreaming(on: boolean, interval?: number) {
            this.start();
            this.isStreaming = on
            this.setReg(jacdac.SystemReg.StreamingSamples, "u8", [this.isStreaming ? 255 : 0])
            if (interval != undefined)
                this.setReg(jacdac.SystemReg.StreamingInterval, "u32", [interval])
        }

        public onStateChanged(handler: () => void) {
            this.on(REPORT_UPDATE, handler)
            this.setStreaming(true);
        }
    }

    export class BufferedSensorClient extends SensorClient {
        protected _samples: any[]
        protected _numSamples: number
        protected _interval: number
        protected _lastTimestamp: number

        constructor(deviceClass: number, role: string, stateFormat: string) {
            super(deviceClass, role, stateFormat);
        }

        enableBuffer(numSamples: number, interval: number) {
            this._numSamples = numSamples
            this._samples = []
            this._interval = interval
            this.setStreaming(true, interval)
        }

        getSamples() {
            if (!this._samples || this._samples.length < this._numSamples)
                return null
            return this._samples.slice(-this._numSamples)
        }

        handlePacket(packet: JDPacket) {
            if (this._samples && packet.serviceCommand == (CMD_GET_REG | jacdac.SystemReg.Reading)) {
                const v = jdunpack(packet.data, this._reading.packFormat) as any[];
                if (v != null) {
                    let num = 1
                    if (this._lastTimestamp != undefined) {
                        const d = packet.timestamp - this._lastTimestamp
                        num = Math.idiv(d + (this._interval >> 1), this._interval)
                        num = Math.clamp(1, 5, num)
                    }
                    this._lastTimestamp = packet.timestamp
                    while (num--)
                        this._samples.push(v)
                    const del = this._samples.length - this._numSamples
                    if (del > 5)
                        this._samples.splice(0, del)
                }
            }
            super.handlePacket(packet)
        }
    }

    //% fixedInstances
    export class SimpleSensorClient extends SensorClient {
        constructor(deviceClass: number, role: string, stateFormat: string) {
            super(deviceClass, role, stateFormat);
        }

        reading(): number {
            this.setStreaming(true);
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        }

        onReadingChangedBy(threshold: number, handler: () => void) {
            if (!handler || threshold < 0)
                return;

            let last: number = this.reading()
            this.onStateChanged(() => {
                const [current] = this._reading.values as any[] as [number]
                if (current == null)
                    return; // ignore missing data

                if (last == null || Math.abs(last - current) >= threshold) {
                    last = current;
                    handler();
                }
            })
        }
    }
}