namespace jacdac {
    export class ActuatorClient extends Client {
        protected state: Buffer;

        constructor(deviceClass: number, stateLength: number, role: string) {
            super(deviceClass, role);
            this.state = Buffer.create(stateLength);
            // TODO
            // this.onDriverEvent(JDDriverEvent.Connected, () => this.notifyChange());
        }

        protected ensureState(length: number) {
            if (length > this.state.length) {
                const b = control.createBuffer(length);
                b.write(0, this.state);
                this.state = b;
            }
        }

        protected notifyChange() {
            this.sendCommand(JDPacket.from(CMD_SET_REG | jacdac.SystemReg.Value, this.state))
        }
    }
}