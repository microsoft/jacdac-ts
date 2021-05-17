namespace jacdac {
    export class LoggerServer extends Server {
        private _lastListenerTime = 0;
        minPriority = jacdac.LoggerPriority.Silent;

        constructor() {
            super("logger", jacdac.SRV_LOGGER);
            this._lastListenerTime = 0;
        }

        handlePacket(packet: JDPacket) {
            this.minPriority = this.handleRegValue(packet, jacdac.LoggerReg.MinPriority, "u8", this.minPriority);
            // TODO: is this a command?
            const SetMinPriority = 0x2000 | jacdac.LoggerReg.MinPriority
            switch (packet.serviceCommand) {
                case SetMinPriority: {
                    const now = control.millis()
                    // lower the priority immediately, but tighten it only when no one 
                    // was asking for lower one for some time
                    const d = packet.intData
                    const elapsed = now - this._lastListenerTime
                    if (d <= this.minPriority ||
                        elapsed > 1500) {
                        this.minPriority = d
                        this._lastListenerTime = now
                    }
                    break;
                }
            }
        }

        debug(message: string): void {
            this.add(jacdac.LoggerPriority.Debug, message);
        }
        log(message: string): void {
            this.add(jacdac.LoggerPriority.Log, message);
        }
        warn(message: string): void {
            this.add(jacdac.LoggerPriority.Warning, message);
        }
        error(message: string): void {
            this.add(jacdac.LoggerPriority.Error, message);
        }

        add(priority: jacdac.LoggerPriority, message: string): void {
            if (!message || !message.length || priority < this.minPriority
                || !this._lastListenerTime)
                return;

            // no one listening?
            if (control.millis() - this._lastListenerTime > 3000) {
                this._lastListenerTime = 0;
                return;
            }

            for (const buf of Buffer.chunkedFromUTF8(message, JD_SERIAL_MAX_PAYLOAD_SIZE)) {
                this.sendReport(JDPacket.from(LoggerCmd.Debug + priority, buf))
            }
        }
    }

    //% whenUsed block="logger"
    export const loggerServer = new LoggerServer()
}