namespace jacdac {
    /**
     * JacDac service running on sensor and streaming data out
     */
    export class SensorServer extends Server {
        public streamingInterval: number; // millis
        public streamingSamples: number;

        constructor(name: string, deviceClass: number) {
            super(name, deviceClass);
            this.streamingInterval = 100;
            this.streamingSamples = 0;
        }

        public handlePacket(packet: JDPacket) {
            this.log(`hpkt ${packet.serviceCommand}`);
            this.stateUpdated = false
            this.streamingInterval = this.handleRegUInt32(packet, jacdac.SystemReg.StreamingInterval, this.streamingInterval)
            const samples = this.handleRegValue(packet, jacdac.SystemReg.StreamingSamples, "u8", this.streamingSamples)
            this.setStreaming(samples)

            switch (packet.serviceCommand) {
                case jacdac.SystemCmd.Calibrate:
                    this.handleCalibrateCommand(packet);
                    break
                default:
                    // let the user deal with it
                    this.handleCustomCommand(packet);
                    break
            }
        }

        // override
        protected serializeState(): Buffer {
            return undefined;
        }

        // override
        protected handleCalibrateCommand(pkt: JDPacket) {
        }

        protected handleCustomCommand(pkt: JDPacket) {
        }

        protected raiseServerEvent(value: number) {
            this.sendEvent(value)
        }

        public setStreaming(samples: number) {
            if (samples) this.startStreaming(samples);
            else this.stopStreaming();
        }

        private startStreaming(samples: number) {
            if (this.streamingSamples) {
                // already running
                this.streamingSamples = samples;
                return;
            }

            this.log(`start`);
            this.streamingSamples = samples;
            control.runInParallel(() => {
                while (this.streamingSamples !== undefined && this.streamingSamples > 0) {
                    // run callback                    
                    const state = this.serializeState();
                    if (state) {
                        // did the state change?
                        if (this.isConnected()) {
                            // send state and record time
                            this.sendReport(JDPacket.from(CMD_GET_REG | jacdac.SystemReg.Reading, state))
                        }
                    }
                    // check streaming interval value or cancelled
                    if (this.streamingInterval < 0 || this.streamingSamples === undefined)
                        break;
                    // waiting for a bit
                    pause(this.streamingInterval);
                    // decrement counter
                    if (this.streamingSamples !== undefined)
                        this.streamingSamples--;
                }
                this.streamingSamples = 0;
                this.log(`stopped`);
            })
        }

        private stopStreaming() {
            if (this.streamingSamples > 0) {
                this.log(`stopping`)
                this.streamingSamples = undefined
                pauseUntil(() => this.streamingSamples === 0);
            }
        }
    }
}